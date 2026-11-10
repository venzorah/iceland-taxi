import { z } from 'zod'
import { jsonError, jsonOk, prisma, withDb } from '@/lib/api'
import { createBooking, toOpsBooking } from '@/lib/booking/service'
import { TODAY_BOOKINGS } from '@/lib/design/opsData'

const createSchema = z.object({
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  serviceId: z.string().optional(),
  routeId: z.string().optional(),
  serviceLabel: z.string().min(1),
  routeLabel: z.string().min(1),
  pickupAt: z.string().datetime().optional().nullable(),
  passengers: z.number().int().positive().default(1),
  luggage: z.number().int().nonnegative().default(0),
  flightNumber: z.string().optional(),
  vehicleId: z.string().optional(),
  vehicleLabel: z.string().optional(),
  driverId: z.string().optional(),
  notes: z.string().optional(),
  isQuote: z.boolean().optional(),
  extras: z
    .object({
      childSeat: z.boolean().optional(),
      returnTrip: z.boolean().optional(),
      meetGreet: z.boolean().optional(),
    })
    .optional(),
  quote: z.object({
    baseIsk: z.number().int().nonnegative(),
    vehicleUpgradeIsk: z.number().int().nonnegative().optional(),
    vehicleLabel: z.string().optional(),
    extras: z
      .object({
        childSeat: z.boolean().optional(),
        returnTrip: z.boolean().optional(),
        meetGreet: z.boolean().optional(),
      })
      .optional(),
    childSeatIsk: z.number().int().optional(),
    meetGreetIsk: z.number().int().optional(),
    durationMinutes: z.number().int().positive().optional(),
    customerCategory: z.enum(['INTERNATIONAL', 'RESIDENT', 'international', 'resident']),
    currency: z.enum(['USD', 'ISK', 'EUR']).optional(),
    iskPerUsd: z.number().positive().optional(),
    iskPerEur: z.number().positive().optional(),
    depositPct: z.number().min(0).max(100).optional(),
  }),
  awaitPaymentWithoutGateway: z.boolean().optional().default(true),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const email = url.searchParams.get('email') || undefined
  const ref = url.searchParams.get('ref') || undefined

  const data = await withDb(
    async () => {
      const bookings = await prisma.booking.findMany({
        where: {
          ...(email ? { guestEmail: email } : {}),
          ...(ref ? { ref } : {}),
        },
        include: { driver: true, vehicle: true, payments: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      return {
        source: 'database' as const,
        bookings,
        ops: bookings.map(toOpsBooking),
      }
    },
    () => ({
      source: 'seed-fallback' as const,
      bookings: TODAY_BOOKINGS,
      ops: TODAY_BOOKINGS,
      note: 'DATABASE_URL unset or unreachable — serving design ops seed fallback.',
    }),
  )
  return jsonOk({ ok: true, ...data })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid booking payload', { issues: parsed.error.flatten() })
  }

  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required to create bookings')
  }

  try {
    const result = await createBooking(parsed.data)
    if (!result.ok) {
      return jsonError(409, result.code, result.message, { conflicts: result.conflicts })
    }
    return jsonOk(
      {
        ok: true,
        source: 'database',
        booking: result.booking,
        quote: result.quote,
        ops: toOpsBooking(result.booking),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(error)
    return jsonError(503, 'DATABASE_ERROR', 'Could not create booking')
  }
}
