import { BookingStatus } from '@prisma/client'
import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { toOpsBooking, updateBookingStatus } from '@/lib/booking/service'

type Ctx = { params: Promise<{ ref: string }> }

async function handleGET(_req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly('bookings')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required')
  }
  const { ref } = await ctx.params
  const booking = await prisma.booking.findUnique({
    where: { ref },
    include: { driver: true, vehicle: true, payments: true, service: true, route: true },
  })
  if (!booking) return jsonError(404, 'NOT_FOUND', 'Booking not found')
  return jsonOk({ ok: true, booking, ops: toOpsBooking(booking) })
}

const patchSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  expectedStatus: z.nativeEnum(BookingStatus),
  driverId: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  vehicleLabel: z.string().nullable().optional(),
  notes: z.string().optional(),
  pickupAddress: z.string().nullable().optional(),
})

async function handlePATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly('bookings')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required')
  }
  const { ref } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid patch payload', { issues: parsed.error.flatten() })
  }

  const result = await updateBookingStatus(ref, parsed.data)
  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : 409
    return jsonError(status, result.code, result.message, {
      conflicts: 'conflicts' in result ? result.conflicts : undefined,
    })
  }
  return jsonOk({ ok: true, booking: result.booking, ops: toOpsBooking(result.booking) })
}

async function handleDELETE(_req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly('bookings')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required')
  }
  await ctx.params
  return jsonError(409, 'BOOKING_HISTORY_REQUIRED', 'Cancel the booking instead. Booking and payment history must be retained.')
}

export const GET = apiHandler(handleGET)
export const PATCH = apiHandler(handlePATCH)
export const DELETE = apiHandler(handleDELETE)
