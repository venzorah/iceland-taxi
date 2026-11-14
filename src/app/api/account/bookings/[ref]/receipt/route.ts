import { apiHandler, jsonError, prisma } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth/session'
import { ownsBooking } from '@/lib/customer/ownership'
type Ctx = { params: Promise<{ ref: string }> }
export const GET = apiHandler(async (_req: Request, ctx: Ctx) => {
  const user = await getCurrentUser()
  if (user?.role !== 'CUSTOMER') return jsonError(401, 'UNAUTHORIZED', 'Sign in with a customer account.')
  const { ref } = await ctx.params
  const booking = await prisma.booking.findUnique({ where: { ref }, include: { payments: { where: { status: { in: ['CAPTURED', 'REFUNDED'] } }, orderBy: { createdAt: 'asc' } } } })
  if (!booking || !ownsBooking(user, booking)) return jsonError(404, 'NOT_FOUND', 'Booking not found.')
  if (!booking.payments.length) return jsonError(409, 'PAYMENT_REQUIRED', 'A payment receipt is available after payment is verified.')
  const company = await prisma.companySettings.findUnique({ where: { id: 'singleton' } })
  const text = [company?.legalName || company?.displayName || 'Iceland Taxi Booking', 'PAYMENT RECEIPT', `Booking: ${booking.ref}`, `Customer: ${booking.guestName || user.name || user.email}`, `Route: ${booking.routeLabel}`, `Pickup: ${booking.pickupAt?.toISOString() || 'Not scheduled'}`, ...booking.payments.map(p => `${p.status === 'REFUNDED' ? 'Refunded' : 'Received'}: ${p.capturedAmount ?? p.amount} ${p.currency} | ${p.createdAt.toISOString()} | Reference: ${p.providerRef || p.id}`), '', 'Generated from verified payment records. This is not a VAT invoice.'].join('\n')
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="receipt-${booking.ref.replace(/[^a-zA-Z0-9-]/g, '')}.txt"`, 'Cache-Control': 'private, no-store' } })
})
