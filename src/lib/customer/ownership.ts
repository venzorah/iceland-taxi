import type { Prisma } from '@prisma/client'
export type CustomerIdentity = { id: string; email: string; role: string }
export function ownsBooking(user: CustomerIdentity | null, booking: { customerId: string | null; guestEmail: string | null }) {
  if (!user || user.role !== 'CUSTOMER') return false
  return booking.customerId ? booking.customerId === user.id : booking.guestEmail?.toLowerCase() === user.email.toLowerCase()
}
export function customerBookingsWhere(user: CustomerIdentity): Prisma.BookingWhereInput {
  return { OR: [{ customerId: user.id }, { customerId: null, guestEmail: { equals: user.email, mode: 'insensitive' } }] }
}
export function cancellationDecision(status: string, paid: boolean, pickupAt: Date | null, now = new Date()) {
  if (['CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'].includes(status)) return { allowed: false as const, message: 'This booking already has a cancellation or refund outcome.' }
  if (['DRIVER_EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'].includes(status) || (pickupAt && pickupAt <= now)) return { allowed: false as const, message: 'This trip has started or its pickup time has passed. Please contact our team.' }
  return { allowed: true as const, status: paid ? 'REFUND_REQUESTED' as const : 'CANCELLED' as const }
}
