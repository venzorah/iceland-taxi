import { BookingStatus, PaymentStatus } from '@prisma/client'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { verifyTeyaWebhookSignature } from '@/lib/payments'

/**
 * Teya payment webhook.
 * Configure the URL in the Teya business portal Integrations settings.
 * We never store card PANs — only session/payment status.
 */
export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature =
    req.headers.get('x-teya-signature') ||
    req.headers.get('x-signature') ||
    req.headers.get('teya-signature')

  const verified = verifyTeyaWebhookSignature(rawBody, signature)
  if (!verified.ok) {
    return jsonError(401, 'INVALID_SIGNATURE', verified.reason)
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return jsonError(400, 'INVALID_JSON', 'Webhook body must be JSON')
  }

  const type = String(event.type || event.event || '')
  const data = (event.data || event.payload || event) as Record<string, unknown>
  const sessionId = String(data.session_id || data.providerRef || '')
  const merchantRef = String(
    data.merchant_reference ||
      (data.metadata as Record<string, string> | undefined)?.booking_ref ||
      '',
  )
  const paymentStatus = String(data.payment_status || '').toUpperCase()

  const payment =
    (sessionId
      ? await prisma.payment.findFirst({ where: { providerRef: sessionId } })
      : null) ||
    (merchantRef
      ? await prisma.payment.findFirst({
          where: { booking: { ref: merchantRef } },
          orderBy: { createdAt: 'desc' },
        })
      : null)

  if (!payment) {
    return jsonOk({ ok: true, ignored: true, reason: 'No matching payment row', type })
  }

  let next: PaymentStatus = payment.status
  let bookingStatus: BookingStatus | undefined

  if (
    type.includes('payment.succeeded') ||
    paymentStatus === 'SUCCESS' ||
    paymentStatus === 'CAPTURED'
  ) {
    next = PaymentStatus.CAPTURED
    bookingStatus = BookingStatus.CONFIRMED
  } else if (type.includes('payment.failed') || paymentStatus === 'FAILED') {
    next = PaymentStatus.FAILED
  } else if (type.includes('payment.refunded') || paymentStatus === 'REFUNDED') {
    next = PaymentStatus.REFUNDED
    bookingStatus = BookingStatus.REFUNDED
  } else if (paymentStatus === 'AUTHORIZED') {
    next = PaymentStatus.AUTHORIZED
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: next,
      capturedAmount: next === PaymentStatus.CAPTURED ? payment.amount : payment.capturedAmount,
      raw: event as object,
    },
  })

  if (bookingStatus) {
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: bookingStatus },
    })
  }

  return jsonOk({
    ok: true,
    paymentId: payment.id,
    status: next,
    bookingStatus: bookingStatus || null,
    signatureVerified: !verified.skipped,
  })
}
