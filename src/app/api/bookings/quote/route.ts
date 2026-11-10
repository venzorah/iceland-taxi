import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/api'
import { quoteFromCatalogue } from '@/lib/booking/service'

const schema = z.object({
  listingId: z.string().optional(),
  listingKind: z.enum(['route', 'service']).optional(),
  routeId: z.string().optional(),
  serviceId: z.string().optional(),
  vehicleId: z.string().optional(),
  pickup: z.string().optional(),
  destination: z.string().optional(),
  extras: z
    .object({
      childSeat: z.boolean().optional(),
      returnTrip: z.boolean().optional(),
      meetGreet: z.boolean().optional(),
    })
    .optional(),
  customerCategory: z.enum(['INTERNATIONAL', 'RESIDENT', 'international', 'resident']).default('INTERNATIONAL'),
  currency: z.enum(['USD', 'ISK', 'EUR']).optional(),
  depositPct: z.number().min(0).max(100).optional(),
})

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required for live quoting')
  }
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid quote payload', { issues: parsed.error.flatten() })
  }

  try {
    const result = await quoteFromCatalogue(parsed.data)
    if (!result.available) return jsonError(409, 'UNAVAILABLE', result.message)
    return jsonOk({ ok: true, ...result })
  } catch (error) {
    console.error(error)
    return jsonError(500, 'QUOTE_ERROR', 'Could not build quote')
  }
}
