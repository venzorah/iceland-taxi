import { BookingStatus, PaymentStatus, Prisma, type Booking, type Payment } from '@prisma/client'
import { prisma } from '@/lib/api'
import { formatChargedAmount } from '@/lib/design/data'
import { teyaProvider } from './teya'

export type TeyaSyncOutcome = 'success' | 'failed' | 'cancelled' | 'expired' | 'pending' | 'not_started' | 'not_found' | 'refunded'

export type TeyaSyncResult = {
  ok: boolean
  outcome: TeyaSyncOutcome
  paid: boolean
  gatewayCalled: boolean
  ref?: string
  email?: string | null
  statusLabel: string
  totalLabel: string
  message: string
  bookingStatus?: BookingStatus
  paymentStatus?: PaymentStatus
}

function moneyLabel(booking: Pick<Booking, 'amountSnapshot' | 'currency'>) {
  const currency = booking.currency
  if (currency === 'EUR' || currency === 'ISK' || currency === 'USD') {
    return formatChargedAmount(booking.amountSnapshot, currency)
  }
  return String(booking.amountSnapshot)
}

/**
 * Confirm a booking only from a Teya session lookup (or a verified webhook).
 * A browser return query is not proof of payment.
 */
export async function syncTeyaPayment(ref: string, hint?: 'success' | 'cancel' | 'failure'): Promise<TeyaSyncResult> {
  const booking = await prisma.booking.findUnique({
    where: { ref },
    include: { payments: { orderBy: { createdAt: 'desc' } } },
  })
  if (!booking) {
    return {
      ok: false,
      outcome: 'not_found',
      paid: false,
      gatewayCalled: false,
      statusLabel: 'Not found',
      totalLabel: '',
      message: 'No booking matches that reference.',
    }
  }

  const payment = booking.payments.find(p => p.status === PaymentStatus.CAPTURED || p.status === PaymentStatus.REFUNDED) || booking.payments[0]
  const base = {
    ref: booking.ref,
    email: booking.guestEmail,
    totalLabel: moneyLabel(booking),
    bookingStatus: booking.status,
    paymentStatus: payment?.status,
  }

  if (!payment || !payment.providerRef) {
    return {
      ...base,
      ok: true,
      outcome: 'not_started',
      paid: false,
      gatewayCalled: false,
      statusLabel: 'Awaiting Payment',
      message:
        'Online payment has not started. Your booking remains unpaid. Retry from your saved booking when online payment is available.',
    }
  }

  if (payment.status === PaymentStatus.REFUNDED) return { ...base, ok: true, outcome: 'refunded', paid: false, gatewayCalled: false, statusLabel: 'Payment refunded', message: 'This payment record is marked refunded.' }
  if (payment.status === PaymentStatus.CAPTURED) {
    return {
      ...base,
      ok: true,
      outcome: 'success',
      paid: true,
      gatewayCalled: true,
      statusLabel: `Payment received · ${booking.status.replaceAll('_', ' ').toLowerCase()}`,
      message: 'Teya already confirmed this payment.',
    }
  }

  const looked = await teyaProvider.lookupSession(payment.providerRef)
  if (!looked.ok) {
    return {
      ...base,
      ok: false,
      outcome: 'pending',
      paid: false,
      gatewayCalled: true,
      statusLabel: 'Awaiting Payment',
      message: `Teya did not confirm the payment (${looked.message}). The booking stays unpaid.`,
    }
  }

  const completed = looked.sessionStatus === 'COMPLETED'
  const paid = completed && looked.paymentStatus === 'SUCCESS'

  if (paid) {
    await markCaptured(payment, booking.id, looked.raw, looked.transactionId)
    const updated = await prisma.booking.findUnique({ where: { id: booking.id }, select: { status: true } })
    return {
      ...base,
      ok: true,
      outcome: 'success',
      paid: true,
      gatewayCalled: true,
      bookingStatus: updated?.status || booking.status,
      paymentStatus: PaymentStatus.CAPTURED,
      statusLabel: `Payment received · ${(updated?.status || booking.status).replaceAll('_', ' ').toLowerCase()}`,
      message: 'Teya sandbox confirmed this payment.',
    }
  }

  if (completed && looked.paymentStatus === 'FAILED') {
    await markFailed(payment, 'Teya reported the payment failed', looked.raw)
    return {
      ...base,
      ok: true,
      outcome: 'failed',
      paid: false,
      gatewayCalled: true,
      paymentStatus: PaymentStatus.FAILED,
      statusLabel: 'Awaiting Payment',
      message: 'Teya reported the payment failed. The booking was not marked paid.',
    }
  }

  if (looked.sessionStatus === 'EXPIRED') {
    await markFailed(payment, 'Teya checkout session expired', looked.raw)
    return {
      ...base,
      ok: true,
      outcome: 'expired',
      paid: false,
      gatewayCalled: true,
      paymentStatus: PaymentStatus.FAILED,
      statusLabel: 'Awaiting Payment',
      message: 'The Teya session expired before payment. The booking was not marked paid.',
    }
  }

  if (hint === 'cancel' || hint === 'failure') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        failureReason: hint === 'cancel' ? 'Customer cancelled checkout' : 'Teya returned a terminal failure',
        raw: looked.raw as Prisma.InputJsonValue,
      },
    })
    return {
      ...base,
      ok: true,
      outcome: hint === 'cancel' ? 'cancelled' : 'failed',
      paid: false,
      gatewayCalled: true,
      statusLabel: 'Awaiting Payment',
      message:
        hint === 'cancel'
          ? 'Checkout was cancelled. Payment has not been verified; your trip remains unpaid.'
          : 'Teya could not take the payment. The booking was not marked paid.',
    }
  }

  return {
    ...base,
    ok: true,
    outcome: 'pending',
    paid: false,
    gatewayCalled: true,
    statusLabel: 'Awaiting Payment',
    message: `Teya session is ${looked.sessionStatus} with payment ${looked.paymentStatus}. The booking stays unpaid until that is SUCCESS.`,
  }
}

async function markCaptured(payment: Payment, bookingId: string, raw: unknown, transactionId?: string) {
  if (payment.status === PaymentStatus.REFUNDED) return
  const previous = payment.raw && typeof payment.raw === 'object' ? payment.raw : {}
  const confirmed = await prisma.$transaction(async tx => {
    const captured = await tx.payment.updateMany({ where: { id: payment.id, status: { notIn: [PaymentStatus.CAPTURED, PaymentStatus.REFUNDED] } }, data: { status: PaymentStatus.CAPTURED, checkoutLeaseKey: null, capturedAmount: payment.amount, failureReason: null, raw: { ...(previous as object), session: raw, transactionId: transactionId || null } as Prisma.InputJsonValue } })
    if (!captured.count) return false
    const result = await tx.booking.updateMany({ where: { id: bookingId, status: { in: [BookingStatus.AWAITING_PAYMENT, BookingStatus.PENDING] } }, data: { status: BookingStatus.CONFIRMED } })
    // A late successful payment never resurrects a cancelled trip or silently refunds money.
    await tx.booking.updateMany({ where: { id: bookingId, status: BookingStatus.CANCELLED }, data: { status: BookingStatus.REFUND_REQUESTED } })
    return result.count > 0
  })
  if (confirmed) {
    try { const { notifyBookingConfirmed } = await import('@/lib/email/notices'); await notifyBookingConfirmed(bookingId) } catch (error) { console.error(error) }
  }
}

async function markFailed(payment: Payment, reason: string, raw: unknown) {
  if (payment.status === PaymentStatus.CAPTURED) return
  await prisma.payment.updateMany({
    where: { id: payment.id, status: { notIn: [PaymentStatus.CAPTURED, PaymentStatus.REFUNDED] } },
    data: {
      status: PaymentStatus.FAILED,
      checkoutLeaseKey: null,
      failureReason: reason,
      raw: raw as Prisma.InputJsonValue,
    },
  })
}

/** Verified payment.succeeded.v1 webhook. Caller must check the signature first. */
export async function captureFromVerifiedWebhook(input: {
  sessionId: string
  merchantRef: string
  transactionId?: string
  raw: unknown
}) {
  if (!input.sessionId) return { applied: false as const, reason: 'A matching checkout session is required' }
  const payment = await prisma.payment.findFirst({ where: { provider: 'teya', providerRef: input.sessionId, ...(input.merchantRef ? { booking: { ref: input.merchantRef } } : {}) } })

  if (!payment) return { applied: false as const, reason: 'No matching payment row' }
  if (payment.status === PaymentStatus.REFUNDED) return { applied: false as const, reason: 'Payment was already refunded' }
  if (payment.status === PaymentStatus.CAPTURED) {
    return { applied: true as const, paymentId: payment.id, status: payment.status, duplicate: true }
  }
  await markCaptured(payment, payment.bookingId, input.raw, input.transactionId)
  return { applied: true as const, paymentId: payment.id, status: PaymentStatus.CAPTURED, duplicate: false }
}
