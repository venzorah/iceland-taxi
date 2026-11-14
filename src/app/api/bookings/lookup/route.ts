import { getCurrentUser } from '@/lib/auth/session'
import { ownsBooking } from '@/lib/customer/ownership'
import { canAccessBooking } from '@/lib/customer/booking-access'
import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { canEditPickup, formatPickupLabel, pickupParts } from '@/lib/booking/pickup'

const bodySchema = z.object({
  ref: z.string().min(3).max(40),
  email: z.string().email(),
})

/**
 * Guest booking lookup — requires both reference and checkout email.
 * Never returns a booking for a mismatched email.
 */
async function handlePOST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required')
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return jsonError(400, 'VALIDATION_ERROR', 'Reference and email are required', {
      issues: parsed.error.flatten(),
    })
  }

  const ref = parsed.data.ref.trim().toUpperCase()
  const email = parsed.data.email.trim().toLowerCase()

  const booking = await prisma.booking.findUnique({
    where: { ref },
  })

  const user = await getCurrentUser()
  const matchingEmail = booking && (booking.guestEmail?.toLowerCase() === email || (ownsBooking(user, booking) && user?.email.toLowerCase() === email))
  if (!booking || !await canAccessBooking(booking, user) || !matchingEmail) {
    return jsonError(404, 'NOT_FOUND', 'No booking matched that reference and email')
  }

  const when = booking.pickupAt ? formatPickupLabel(booking.pickupAt) : 'Schedule TBC'
  const pickup = booking.pickupAt ? pickupParts(booking.pickupAt) : null

  const charged = booking.currency === 'ISK' ? (booking.amountIskSnapshot ?? booking.amountSnapshot) : booking.amountSnapshot
  const grouped = Math.round(charged).toLocaleString('en-US')
  const amountLabel =
    booking.currency === 'ISK'
      ? `ISK ${grouped}`
      : booking.currency === 'EUR'
        ? `€${grouped.replace(/,/g, '.')}`
        : `$${grouped}`

  const detail = `${booking.vehicleLabel || 'Vehicle TBC'} · ${booking.status.replaceAll('_', ' ')} · ${amountLabel}`

  return jsonOk({
    ok: true,
    booking: {
      ref: booking.ref,
      serviceLabel: booking.serviceLabel,
      routeLabel: booking.routeLabel,
      status: booking.status,
      summary: `${when} · ${detail}`,
      detail,
      pickupAt: booking.pickupAt?.toISOString() ?? null,
      pickupDate: pickup?.date ?? '',
      pickupTime: pickup?.time ?? '',
      pickupLabel: when,
      canEditPickup: canEditPickup(booking.status),
    },
  })
}

export const POST = apiHandler(handlePOST)
