import { BookingStatus, PaymentStatus, Prisma, type Booking, type Payment } from '@prisma/client'
import { prisma } from '@/lib/api'
import { formatChargedAmount } from '@/lib/design/data'
import { teyaProvider } from './teya'

export type TeyaSyncOutcome = 'success' | 'failed' | 'cancelled' | 'expired' | 'pending' | 'not_started' | 'not_found'

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

  const payment = booking.payments[0]
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
        'No Teya payment was started, so this booking was not marked paid. Add sandbox credentials and pay again.',
    }
  }

  if (payment.status === PaymentStatus.CAPTURED && booking.status === BookingStatus.CONFIRMED) {
    return {
      ...base,
      ok: true,
      outcome: 'success',
      paid: true,
      gatewayCalled: true,
      statusLabel: 'Confirmed · payment received',
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
    return {
      ...base,
      ok: true,
      outcome: 'success',
      paid: true,
      gatewayCalled: true,
      bookingStatus: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.CAPTURED,
      statusLabel: 'Confirmed · payment received',
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
          ? 'Checkout was cancelled. No payment was taken.'
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
  const previous = payment.raw && typeof payment.raw === 'object' ? payment.raw : {}
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.CAPTURED,
      capturedAmount: payment.amount,
      failureReason: null,
      raw: { ...(previous as object), session: raw, transactionId: transactionId || null } as Prisma.InputJsonValue,
    },
  })
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (booking && (booking.status === BookingStatus.AWAITING_PAYMENT || booking.status === BookingStatus.PENDING)) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    })
    try {
      const { notifyBookingConfirmed } = await import('@/lib/email/notices')
      await notifyBookingConfirmed(bookingId)
    } catch (error) {
      console.error(error)
    }
  }
}

async function markFailed(payment: Payment, reason: string, raw: unknown) {
  if (payment.status === PaymentStatus.CAPTURED) return
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.FAILED,
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
  const payment =
    (input.sessionId
      ? await prisma.payment.findFirst({ where: { providerRef: input.sessionId } })
      : null) ||
    (input.merchantRef
      ? await prisma.payment.findFirst({
          where: { booking: { ref: input.merchantRef }, provider: 'teya' },
          orderBy: { createdAt: 'desc' },
        })
      : null)

  if (!payment) return { applied: false as const, reason: 'No matching payment row' }
  if (payment.status === PaymentStatus.CAPTURED) {
    return { applied: true as const, paymentId: payment.id, status: payment.status, duplicate: true }
  }
  await markCaptured(payment, payment.bookingId, input.raw, input.transactionId)
  return { applied: true as const, paymentId: payment.id, status: PaymentStatus.CAPTURED, duplicate: false }
}
