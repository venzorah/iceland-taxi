import { getCurrentUser } from '@/lib/auth/session'
import { grantGuestBookingAccess } from '@/lib/customer/booking-access'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma, withDb } from '@/lib/api'
import { createBooking, toOpsBooking } from '@/lib/booking/service'
import { TODAY_BOOKINGS } from '@/lib/design/opsData'

const createSchema = z.object({
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  serviceId: z.string().optional(),
  routeId: z.string().optional(),
  listingId: z.string().optional(),
  listingKind: z.enum(['route', 'service']).optional(),
  pickup: z.string().optional(),
  destination: z.string().optional(),
  serviceLabel: z.string().min(1).optional(),
  routeLabel: z.string().min(1).optional(),
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
    baseIsk: z.number().int().nonnegative().optional(),
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

async function handleGET(req: Request) {
  const blocked = await rejectDriverOnly('bookings')
  if (blocked) return blocked
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
      note: 'DATABASE_URL unset or unreachable, serving design ops seed fallback.',
    }),
  )
  return jsonOk({ ok: true, ...data })
}

async function handlePOST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid booking payload', { issues: parsed.error.flatten() })
  }

  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required to create bookings')
  }

  const user = await getCurrentUser()
  if (user?.role !== 'CUSTOMER' && (process.env.BOOKING_ACCESS_SECRET?.length || 0) < 32) return jsonError(503, 'BOOKING_ACCESS_NOT_CONFIGURED', 'Guest booking is temporarily unavailable.')
  if (parsed.data.driverId) { const blocked = await rejectDriverOnly('bookings'); if (blocked) return blocked }
  try {
    const result = await createBooking({
      ...parsed.data,
      customerId: user?.role === 'CUSTOMER' ? user.id : undefined,
      guestEmail: user?.role === 'CUSTOMER' ? user.email : parsed.data.guestEmail,
      serviceLabel: parsed.data.serviceLabel || 'Published listing',
      routeLabel: parsed.data.routeLabel || 'Published listing',
      quote: { ...parsed.data.quote, baseIsk: parsed.data.quote.baseIsk ?? 0 },
    })
    if (!result.ok) {
      return jsonError(409, result.code, result.message, 'conflicts' in result ? { conflicts: result.conflicts } : undefined)
    }
    if (!user) await grantGuestBookingAccess(result.booking.id)
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

export const GET = apiHandler(handleGET)
export const POST = apiHandler(handlePOST)
