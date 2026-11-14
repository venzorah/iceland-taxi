import { z } from 'zod'
import { apiHandler, jsonError, jsonOk } from '@/lib/api'
import { checkAvailability, computeEndsAt } from '@/lib/booking/availability'

const schema = z.object({
  pickupAt: z.string().datetime(),
  durationMinutes: z.number().int().positive().default(60),
  returnTrip: z.boolean().optional(),
  vehicleId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  excludeBookingId: z.string().optional(),
})

async function handlePOST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required for availability checks')
  }
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid availability payload', { issues: parsed.error.flatten() })
  }

  const pickupAt = new Date(parsed.data.pickupAt)
  const { endsAt, durationMinutes } = computeEndsAt(
    pickupAt,
    parsed.data.durationMinutes,
    parsed.data.returnTrip,
  )
  const result = await checkAvailability({
    pickupAt,
    endsAt,
    vehicleId: parsed.data.vehicleId,
    driverId: parsed.data.driverId,
    excludeBookingId: parsed.data.excludeBookingId,
  })

  return jsonOk({ ok: true, durationMinutes, endsAt, ...result })
}

export const POST = apiHandler(handlePOST)
