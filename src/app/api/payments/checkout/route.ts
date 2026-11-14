import type { Prisma } from '@prisma/client'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { getPaymentProvider } from '@/lib/payments'
import { createBooking } from '@/lib/booking/service'
import { getCurrentUser } from '@/lib/auth/session'
import { canAccessBooking, grantGuestBookingAccess } from '@/lib/customer/booking-access'
import { ownsBooking } from '@/lib/customer/ownership'
import { syncTeyaPayment } from '@/lib/payments/sync-teya'
const schema = z.object({
  requestKey: z.string().uuid().optional(), bookingRef: z.string().min(3).max(80).optional(),
  create: z.object({
    guestName: z.string().trim().min(1).max(100), guestEmail: z.string().trim().email(), guestPhone: z.string().trim().max(30).optional(),
    pickupAt: z.string().datetime(), pickupAddress: z.string().trim().min(1).max(500),
    passengers: z.number().int().min(1).max(70), luggage: z.number().int().min(0).max(70).default(0),
    flightNumber: z.string().trim().max(30).optional(), vehicleId: z.string().min(1), vehicleLabel: z.string().optional(),
    listingId: z.string().min(1), listingKind: z.enum(['route', 'service']),
    extras: z.object({ childSeat: z.boolean().optional(), returnTrip: z.boolean().optional(), meetGreet: z.boolean().optional() }).optional(),
    customerCategory: z.enum(['INTERNATIONAL', 'RESIDENT', 'international', 'resident']), currency: z.enum(['EUR', 'ISK']).optional(), notes: z.string().trim().max(2000).optional(),
  }).optional(),
  description: z.string().max(200).optional(),
}).refine(v => Boolean(v.bookingRef) !== Boolean(v.create), 'Provide one booking or one creation payload.')
const include = { payments: { orderBy: { createdAt: 'desc' as const } }, vehicle: true, customer: { select: { email: true } } } as const
type CheckoutBooking = Prisma.BookingGetPayload<{ include: typeof include }>
function checkoutView(b: CheckoutBooking) {
  return { ref: b.ref, listingId: b.listingId, adminPriceIsk: b.adminPriceIsk, vehicleId: b.vehicleId, vehicle: b.vehicle ? { name: b.vehicle.name, upgradeIsk: b.vehicle.upgradeIsk } : null, amountSnapshot: b.amountSnapshot, amountIskSnapshot: b.amountIskSnapshot, currency: b.currency, status: b.status, pickupAt: b.pickupAt, routeLabel: b.routeLabel }
}
export const POST = apiHandler(async (req: Request) => {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter your contact details, vehicle, pickup address and future Iceland pickup time.', { issues: parsed.error.flatten() })
  const input = parsed.data
  const user = await getCurrentUser()
  let booking = input.bookingRef ? await prisma.booking.findUnique({ where: { ref: input.bookingRef }, include }) : null
  if (input.bookingRef && (!booking || !await canAccessBooking(booking, user))) return jsonError(404, 'NOT_FOUND', 'Booking not found.')
  if (input.create) {
    if (user?.role !== 'CUSTOMER' && (process.env.BOOKING_ACCESS_SECRET?.length || 0) < 32) return jsonError(503, 'BOOKING_ACCESS_NOT_CONFIGURED', 'Guest checkout is temporarily unavailable.')
    const c = { ...input.create, guestEmail: user?.role === 'CUSTOMER' ? user.email : input.create.guestEmail.toLowerCase() }
    const customerId = user?.role === 'CUSTOMER' ? user.id : undefined
    const requestKey = input.requestKey || randomUUID()
    const requestHash = createHash('sha256').update(JSON.stringify({ ...c, customerId })).digest('hex')
    booking = await prisma.booking.findUnique({ where: { requestKey }, include })
    if (booking && (booking.requestHash !== requestHash || (booking.customerId && !ownsBooking(user, booking)))) return jsonError(409, 'REQUEST_CHANGED', 'This checkout request already represents a different booking. Open your saved trip or start a new checkout.')
    if (!booking) {
      try {
        const created = await createBooking({ ...c, customerId, requestKey, requestHash, serviceLabel: '', routeLabel: '', quote: { baseIsk: 0, customerCategory: c.customerCategory, currency: c.currency }, awaitPaymentWithoutGateway: true })
        if (!created.ok) return jsonError(409, created.code, created.message)
        booking = await prisma.booking.findUnique({ where: { id: created.booking.id }, include })
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2002') throw error
        booking = await prisma.booking.findUnique({ where: { requestKey }, include })
        if (!booking || booking.requestHash !== requestHash || (booking.customerId && !ownsBooking(user, booking))) return jsonError(409, 'REQUEST_CONFLICT', 'Checkout changed. Please refresh your saved trip.')
      }
    }
    if (booking && !booking.customerId) await grantGuestBookingAccess(booking.id)
  }
  if (!booking) return jsonError(404, 'NOT_FOUND', 'Booking not found.')
  const ref = booking.ref
  if (!['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(booking.status)) return jsonError(409, 'BOOKING_LOCKED', 'This booking cannot start a new payment.', { bookingRef: ref })
  if (booking.payments.some(p => ['CAPTURED', 'AUTHORIZED', 'REFUNDED'].includes(p.status))) return jsonError(409, 'PAYMENT_ALREADY_RECORDED', 'Payment is already recorded or being processed. Refresh your trip.', { bookingRef: ref })
  const provider = getPaymentProvider()
  if (!provider.isConfigured()) return jsonError(503, 'PAYMENT_NOT_CONFIGURED', 'Your booking is saved and remains unpaid. Online payment is not available yet.', { bookingRef: ref, paid: false })
  await prisma.payment.updateMany({ where: { checkoutLeaseKey: booking.id, status: { notIn: ['PENDING', 'AUTHORIZED'] } }, data: { checkoutLeaseKey: null } })
  let payment = booking.payments.find(p => p.status === 'PENDING')
  if (payment?.providerRef && payment.checkoutUrl && Date.now() - payment.createdAt.getTime() > 30 * 60000) {
    await syncTeyaPayment(ref)
    payment = (await prisma.payment.findUnique({ where: { id: payment.id } })) || undefined
    if (payment && payment.status !== 'PENDING') return jsonError(409, 'PAYMENT_UPDATED', 'The payment status changed. Refresh your trip before retrying.', { bookingRef: ref })
  }
  if (payment?.checkoutUrl && payment.providerRef) return jsonOk({ ok: true, booking: checkoutView(booking), checkoutUrl: payment.checkoutUrl, provider: provider.id, demo: false })
  let created = false
  if (!payment) {
    try {
      payment = await prisma.payment.create({ data: { bookingId: booking.id, provider: provider.id, status: 'PENDING', currency: booking.currency, amount: booking.amountSnapshot, checkoutLeaseKey: booking.id } }); created = true
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error
      return jsonError(409, 'CHECKOUT_STARTING', 'Checkout is starting. Wait a moment and retry your saved booking.', { bookingRef: ref })
    }
  }
  if (!created) {
    const claimed = await prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING', updatedAt: payment.updatedAt, OR: [{ failureReason: { not: null } }, { updatedAt: { lt: new Date(Date.now() - 60000) } }] }, data: { updatedAt: new Date(), failureReason: null, checkoutLeaseKey: booking.id } })
    if (!claimed.count) return jsonError(409, 'CHECKOUT_STARTING', 'Checkout is starting. Wait a moment and retry your saved booking.', { bookingRef: ref })
  }
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const returnBase = `${origin}/api/payments/teya/return?ref=${encodeURIComponent(ref)}`
  const result = await provider.createCheckout({ bookingRef: ref, bookingId: booking.id, idempotencyKey: `itb-${payment.id}`, amount: booking.amountSnapshot, currency: booking.currency, description: `Iceland Taxi Booking · ${booking.serviceLabel}`, returnUrl: `${returnBase}&result=success`, cancelUrl: `${returnBase}&result=cancel`, failureUrl: `${returnBase}&result=failure`, customer: { name: booking.guestName || undefined, email: booking.customer?.email || booking.guestEmail || undefined, phone: booking.guestPhone || undefined } })
  if (!result.ok) {
    await prisma.payment.update({ where: { id: payment.id }, data: { failureReason: result.message } })
    return jsonError(502, result.code, 'Your booking is saved and remains unpaid. Payment could not start. Retry from your trip.', { bookingRef: ref, paid: false })
  }
  await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: result.providerRef, checkoutUrl: result.checkoutUrl, failureReason: null } })
  const current = await prisma.booking.findUnique({ where: { id: booking.id }, select: { status: true } })
  if (!current || !['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(current.status)) return jsonError(409, 'BOOKING_LOCKED', 'This booking changed and cannot continue checkout.', { bookingRef: ref })
  return jsonOk({ ok: true, booking: checkoutView(booking), checkoutUrl: result.checkoutUrl, provider: result.provider, demo: false })
})
