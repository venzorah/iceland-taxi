import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth/session'
import { customerBookingsWhere } from '@/lib/customer/ownership'
import { customerPickupView } from '@/lib/booking/pickup'

/** Trips for the signed-in customer. */
async function handleGET() {
  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required')
  }
  const user = await getCurrentUser()
  if (user?.role !== 'CUSTOMER') return jsonError(401, 'UNAUTHENTICATED', 'Sign in as the customer to see trips.')

  const bookings = await prisma.booking.findMany({
    where: customerBookingsWhere(user),
    include: { driver: { select: { displayName: true } }, payments: { select: { status: true, capturedAmount: true, amount: true } } },
    orderBy: [{ pickupAt: 'asc' }, { createdAt: 'desc' }],
  })

  return jsonOk({
    ok: true,
    email: user.email,
    trips: bookings.map((booking) =>
      ({ ...customerPickupView({
        ref: booking.ref,
        serviceLabel: booking.serviceLabel,
        routeLabel: booking.routeLabel,
        status: booking.status,
        pickupAt: booking.pickupAt,
        flightNumber: booking.flightNumber,
        vehicleLabel: booking.vehicleLabel,
        passengers: booking.passengers,
        driverName: booking.driver?.displayName ?? null,
      }), amountSnapshot: booking.amountSnapshot, currency: booking.currency, paid: booking.payments.some(p => ['CAPTURED', 'AUTHORIZED'].includes(p.status)), paymentStatus: booking.payments.some(p => p.status === 'CAPTURED') ? 'CAPTURED' : booking.payments.some(p => p.status === 'AUTHORIZED') ? 'AUTHORIZED' : booking.payments.some(p => p.status === 'REFUNDED') ? 'REFUNDED' : 'UNPAID', hasReceipt: booking.payments.some(p => ['CAPTURED', 'REFUNDED'].includes(p.status)) }),
    ),
  })
}

export const GET = apiHandler(handleGET)
