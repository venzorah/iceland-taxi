import { jsonError, jsonOk, prisma } from '@/lib/api'
import { getDemoGuestEmail } from '@/lib/auth/demo'
import { customerPickupView } from '@/lib/booking/pickup'

/** Trips for the signed-in customer. */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required')
  }
  const email = await getDemoGuestEmail()
  if (!email) return jsonError(401, 'UNAUTHENTICATED', 'Sign in as the customer to see trips.')

  const bookings = await prisma.booking.findMany({
    where: { guestEmail: { equals: email, mode: 'insensitive' } },
    include: { driver: { select: { displayName: true } } },
    orderBy: [{ pickupAt: 'asc' }, { createdAt: 'desc' }],
  })

  return jsonOk({
    ok: true,
    email,
    trips: bookings.map((booking) =>
      customerPickupView({
        ref: booking.ref,
        serviceLabel: booking.serviceLabel,
        routeLabel: booking.routeLabel,
        status: booking.status,
        pickupAt: booking.pickupAt,
        flightNumber: booking.flightNumber,
        vehicleLabel: booking.vehicleLabel,
        passengers: booking.passengers,
        driverName: booking.driver?.displayName ?? null,
      }),
    ),
  })
}
