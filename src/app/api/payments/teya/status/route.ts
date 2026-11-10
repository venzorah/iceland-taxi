import { jsonError, jsonOk } from '@/lib/api'
import { syncTeyaPayment } from '@/lib/payments/sync-teya'

/** Re-check the latest Teya sandbox session and return the stored outcome. */
export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required to confirm a payment')
  }
  const ref = new URL(req.url).searchParams.get('ref') || ''
  if (!ref) return jsonError(400, 'VALIDATION_ERROR', 'ref is required')
  const synced = await syncTeyaPayment(ref)
  return jsonOk(synced, { status: synced.outcome === 'not_found' ? 404 : 200 })
}
