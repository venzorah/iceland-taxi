import { z } from 'zod'
import { TODAY_BOOKINGS } from '@/lib/design/opsData'
import { jsonError, jsonOk, prisma, withDb } from '@/lib/api'

const createSchema = z.object({
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  serviceLabel: z.string().min(1),
  routeLabel: z.string().min(1),
  pickupAt: z.string().datetime().optional(),
  passengers: z.number().int().positive().default(1),
  luggage: z.number().int().nonnegative().default(0),
  flightNumber: z.string().optional(),
  currency: z.enum(['USD', 'ISK']),
  amountSnapshot: z.number().int().nonnegative(),
  customerCategory: z.enum(['INTERNATIONAL', 'RESIDENT']).default('INTERNATIONAL'),
})

function makeRef() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = 'ITB-'
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export async function GET() {
  const data = await withDb(
    async () => {
      const bookings = await prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
      return { source: 'database' as const, bookings }
    },
    () => ({
      source: 'seed-fallback' as const,
      bookings: TODAY_BOOKINGS,
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
    return jsonOk(
      {
        ok: true,
        source: 'stub',
        booking: {
          ref: makeRef(),
          status: 'PENDING',
          ...parsed.data,
        },
        note: 'DATABASE_URL unset — booking accepted as in-memory stub only.',
      },
      { status: 201 },
    )
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        ref: makeRef(),
        guestName: parsed.data.guestName,
        guestEmail: parsed.data.guestEmail,
        guestPhone: parsed.data.guestPhone,
        serviceLabel: parsed.data.serviceLabel,
        routeLabel: parsed.data.routeLabel,
        pickupAt: parsed.data.pickupAt ? new Date(parsed.data.pickupAt) : null,
        passengers: parsed.data.passengers,
        luggage: parsed.data.luggage,
        flightNumber: parsed.data.flightNumber,
        currency: parsed.data.currency,
        amountSnapshot: parsed.data.amountSnapshot,
        customerCategory: parsed.data.customerCategory,
        status: 'PENDING',
      },
    })
    return jsonOk({ ok: true, source: 'database', booking }, { status: 201 })
  } catch (error) {
    console.error(error)
    return jsonError(503, 'DATABASE_ERROR', 'Could not create booking')
  }
}
