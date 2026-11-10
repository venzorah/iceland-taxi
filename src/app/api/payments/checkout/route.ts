import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/api'
import { getPaymentProvider } from '@/lib/payments'

const schema = z.object({
  bookingRef: z.string().min(1),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'ISK']),
  description: z.string().default('Iceland Taxi Booking'),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid checkout payload', { issues: parsed.error.flatten() })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const provider = getPaymentProvider()
  const result = await provider.createCheckout({
    bookingRef: parsed.data.bookingRef,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    description: parsed.data.description,
    returnUrl: parsed.data.returnUrl || `${origin}/account`,
    cancelUrl: parsed.data.cancelUrl || `${origin}/book`,
  })

  if (!result.ok) {
    const status = result.code === 'MISSING_CREDENTIALS' ? 503 : 502
    return jsonError(status, result.code, result.message, { provider: result.provider })
  }

  return jsonOk(result)
}
