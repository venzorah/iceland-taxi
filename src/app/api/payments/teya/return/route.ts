import { NextResponse } from 'next/server'
import { syncTeyaPayment } from '@/lib/payments/sync-teya'

/**
 * Browser return from Teya hosted checkout.
 * The query string is only a hint. Payment status comes from the session lookup.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const ref = url.searchParams.get('ref') || ''
  const result = url.searchParams.get('result')
  const hint = result === 'cancel' || result === 'failure' || result === 'success' ? result : undefined
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin

  if (!ref) {
    return NextResponse.redirect(`${origin}/book?payment=not_started`)
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.redirect(`${origin}/book?ref=${encodeURIComponent(ref)}&payment=pending`)
  }

  const synced = await syncTeyaPayment(ref, hint)
  const payment = synced.paid ? 'success' : synced.outcome
  return NextResponse.redirect(
    `${origin}/book?ref=${encodeURIComponent(ref)}&payment=${encodeURIComponent(payment)}`,
  )
}
