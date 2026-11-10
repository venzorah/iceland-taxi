import { z } from 'zod'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { getDemoGuestEmail } from '@/lib/auth/demo'
import { checkAvailability } from '@/lib/booking/availability'
import {
  authorizePickupEdit,
  formatPickupConfirmation,
  formatPickupLabel,
  pickupParts,
  returnTripFromExtras,
  schedulePickupChange,
} from '@/lib/booking/pickup'

type Ctx = { params: Promise<{ ref: string }> }

const bodySchema = z.object({
  date: z.string(),
  time: z.string(),
})

/** Customer changes the pickup date and time. The listing and admin price are not written. */
export async function PATCH(req: Request, ctx: Ctx) {
  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required')
  }

  const { ref } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'VALIDATION_ERROR', 'Enter a pickup date and time.')
  }

  const bookingRef = ref.trim().toUpperCase()
  const existing = await prisma.booking.findUnique({ where: { ref: bookingRef } })
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Booking not found')

  const auth = authorizePickupEdit(existing, await getDemoGuestEmail())
  if (!auth.ok) {
    return jsonError(auth.code === 'UNAUTHENTICATED' ? 401 : 403, auth.code, auth.message)
  }

  const scheduled = schedulePickupChange({
    status: existing.status,
    durationMinutes: existing.durationMinutes,
    returnTrip: returnTripFromExtras(existing.extras),
    date: parsed.data.date,
    time: parsed.data.time,
  })
  if (!scheduled.ok) {
    return jsonError(scheduled.code === 'VALIDATION_ERROR' ? 400 : 409, scheduled.code, scheduled.message)
  }

  if (existing.vehicleId || existing.driverId) {
    const avail = await checkAvailability({
      pickupAt: scheduled.data.pickupAt,
      endsAt: scheduled.data.endsAt,
      vehicleId: existing.vehicleId,
      driverId: existing.driverId,
      excludeBookingId: existing.id,
    })
    if (!avail.available) {
      return jsonError(409, 'NOT_AVAILABLE', 'That pickup time overlaps another trip for the assigned driver or vehicle.', {
        conflicts: avail.conflicts,
      })
    }
  }

  const kept = {
    listingId: existing.listingId,
    listingKind: existing.listingKind,
    adminPriceIsk: existing.adminPriceIsk,
    amountSnapshot: existing.amountSnapshot,
    amountIskSnapshot: existing.amountIskSnapshot,
    currency: existing.currency,
  }

  const booking = await prisma.booking.update({
    where: { id: existing.id },
    data: scheduled.data,
    select: {
      ref: true,
      pickupAt: true,
      listingId: true,
      listingKind: true,
      adminPriceIsk: true,
      amountSnapshot: true,
      amountIskSnapshot: true,
      currency: true,
    },
  })

  if (
    booking.listingId !== kept.listingId ||
    booking.listingKind !== kept.listingKind ||
    booking.adminPriceIsk !== kept.adminPriceIsk ||
    booking.amountSnapshot !== kept.amountSnapshot ||
    booking.amountIskSnapshot !== kept.amountIskSnapshot ||
    booking.currency !== kept.currency
  ) {
    return jsonError(500, 'PRICE_CHANGED', 'Pickup time was not saved because the fixed price would have changed.')
  }

  const when = booking.pickupAt
  if (!when) return jsonError(500, 'NOT_SAVED', 'Pickup time was not saved.')
  const parts = pickupParts(when)
  return jsonOk({
    ok: true,
    ref: booking.ref,
    pickupAt: when.toISOString(),
    date: parts.date,
    time: parts.time,
    label: formatPickupLabel(when),
    confirmation: formatPickupConfirmation(when),
    listingId: booking.listingId,
    adminPriceIsk: booking.adminPriceIsk,
    amountSnapshot: booking.amountSnapshot,
  })
}
