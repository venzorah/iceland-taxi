import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth/session'
import { ownsBooking, cancellationDecision } from '@/lib/customer/ownership'
type Ctx = { params: Promise<{ ref: string }> }
export const POST = apiHandler(async (req: Request, ctx: Ctx) => {
  const user = await getCurrentUser()
  if (user?.role !== 'CUSTOMER') return jsonError(401, 'UNAUTHORIZED', 'Sign in with a customer account.')
  const parsed = z.object({ reason: z.string().trim().min(1).max(1000) }).strict().safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Please provide a cancellation reason.')
  const { ref } = await ctx.params
  try {
    const result = await prisma.$transaction(async tx => {
      const booking = await tx.booking.findUnique({ where: { ref }, include: { payments: true } })
      if (!booking || !ownsBooking(user, booking)) return { error: 'Booking not found.', status: 404 }
      if (['CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'].includes(booking.status)) return { booking, unchanged: true }
      const paid = booking.payments.some(p => ['CAPTURED', 'AUTHORIZED'].includes(p.status))
      const decision = cancellationDecision(booking.status, paid, booking.pickupAt)
      if (!decision.allowed) return { error: decision.message, status: 409 }
      const updated = await tx.booking.update({ where: { id: booking.id }, data: { status: decision.status } })
      await tx.message.create({ data: { bookingId: booking.id, authorId: user.id, authorRole: 'customer', guestEmail: user.email, body: `Cancellation${paid ? '/refund' : ''} request: ${parsed.data.reason}`, unread: true } })
      return { booking: updated, unchanged: false }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 })
    if ('error' in result) return jsonError(result.status!, 'CANCELLATION_UNAVAILABLE', result.error!)
    return jsonOk({ ok: true, status: result.booking.status, message: result.booking.status === 'REFUND_REQUESTED' ? 'Your cancellation/refund request was saved for review. No refund has been issued yet.' : 'Your booking is cancelled.' })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2034') return jsonError(409, 'BOOKING_CHANGED', 'This booking changed. Refresh and try again.')
    throw error
  }
})
