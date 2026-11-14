import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth/session'
import { ownsBooking } from '@/lib/customer/ownership'
import { checkAvailability } from '@/lib/booking/availability'
import { formatPickupConfirmation, formatPickupLabel, pickupParts, existingPickupDuration, schedulePickupChange } from '@/lib/booking/pickup'
type Ctx = { params: Promise<{ ref: string }> }
export const PATCH = apiHandler(async (req: Request, ctx: Ctx) => {
  const user = await getCurrentUser()
  if (user?.role !== 'CUSTOMER') return jsonError(401, 'UNAUTHENTICATED', 'Sign in with a customer account.')
  const parsed = z.object({ date: z.string(), time: z.string() }).strict().safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter a pickup date and time.')
  const { ref } = await ctx.params
  try {
    return await prisma.$transaction(async tx => {
      const existing = await tx.booking.findUnique({ where: { ref } })
      if (!existing || !ownsBooking(user, existing)) return jsonError(404, 'NOT_FOUND', 'Booking not found.')
      const scheduled = schedulePickupChange({ status: existing.status, durationMinutes: existingPickupDuration(existing), returnTrip: false, ...parsed.data })
      if (!scheduled.ok) return jsonError(scheduled.code === 'VALIDATION_ERROR' ? 400 : 409, scheduled.code, scheduled.message)
      if (scheduled.data.pickupAt <= new Date()) return jsonError(400, 'INVALID_PICKUP', 'Choose a future pickup time in Iceland.')
      const availability = await checkAvailability({ pickupAt: scheduled.data.pickupAt, endsAt: scheduled.data.endsAt, vehicleId: existing.vehicleId, driverId: existing.driverId, excludeBookingId: existing.id }, tx)
      if (!availability.available) return jsonError(409, 'NOT_AVAILABLE', 'The assigned vehicle or driver is unavailable at that time.')
      const booking = await tx.booking.update({ where: { id: existing.id }, data: scheduled.data, select: { ref: true, pickupAt: true, listingId: true, adminPriceIsk: true, amountSnapshot: true } })
      const when = booking.pickupAt!
      return jsonOk({ ok: true, ...booking, pickupAt: when.toISOString(), ...pickupParts(when), label: formatPickupLabel(when), confirmation: formatPickupConfirmation(when) })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2034') return jsonError(409, 'BOOKING_CHANGED', 'This booking changed. Refresh and try again.')
    throw error
  }
})
