import { z } from 'zod'
import { jsonError, jsonOk, prisma } from '@/lib/api'

const bodySchema = z.object({
  ref: z.string().min(3).max(40),
  email: z.string().email(),
})

/**
 * Guest booking lookup — requires both reference and checkout email.
 * Never returns a booking for a mismatched email.
 */
export async function POST(req: Request) {
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

  if (!booking || !booking.guestEmail || booking.guestEmail.toLowerCase() !== email) {
    return jsonError(404, 'NOT_FOUND', 'No booking matched that reference and email')
  }

  const when = booking.pickupAt
    ? new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(booking.pickupAt)
    : 'Schedule TBC'

  const charged = booking.currency === 'ISK' ? (booking.amountIskSnapshot ?? booking.amountSnapshot) : booking.amountSnapshot
  const grouped = Math.round(charged).toLocaleString('en-US')
  const amountLabel =
    booking.currency === 'ISK'
      ? `ISK ${grouped}`
      : booking.currency === 'EUR'
        ? `€${grouped.replace(/,/g, '.')}`
        : `$${grouped}`

  return jsonOk({
    ok: true,
    booking: {
      ref: booking.ref,
      serviceLabel: booking.serviceLabel,
      routeLabel: booking.routeLabel,
      status: booking.status,
      summary: `${when} · ${booking.vehicleLabel || 'Vehicle TBC'} · ${booking.status.replaceAll('_', ' ')} · ${amountLabel}`,
    },
  })
}
