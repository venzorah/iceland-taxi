import { jsonError, jsonOk } from '@/lib/api'
import { verifyTeyaWebhookSignature } from '@/lib/payments'
import { captureFromVerifiedWebhook } from '@/lib/payments/sync-teya'

/**
 * Teya payment.succeeded.v1 webhook.
 * Signature is SHA256withRSA over the raw body (x-teya-signature, base64).
 * Unsigned events never mark a booking paid. Failures have no webhook;
 * the return URL looks the session up instead.
 */
export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-teya-signature')
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

  const type = String(event.type || event.event_type || event.event || '')
  if (!type.includes('payment.succeeded')) {
    return jsonOk({ ok: true, ignored: true, reason: 'Only payment.succeeded marks a booking paid', type })
  }

  const data = (event.data || event.payload || event) as Record<string, unknown>
  const sessionId = String(data.session_id || '')
  const merchantRef = String(data.merchant_reference || '')
  const transactionId = data.transaction_id ? String(data.transaction_id) : undefined

  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required')
  }

  const applied = await captureFromVerifiedWebhook({
    sessionId,
    merchantRef,
    transactionId,
    raw: event,
  })

  return jsonOk({ ok: true, signatureVerified: true, ...applied })
}
