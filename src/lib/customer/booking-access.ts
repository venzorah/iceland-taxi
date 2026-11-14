import { createHmac, createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth/session'
import { canUseAdminModule } from '@/lib/auth/permissions'
import { ServiceUnavailableError } from '@/lib/api'
import { ownsBooking } from './ownership'
const keyFor = (id: string) => 'itb_booking_' + createHash('sha256').update(id).digest('hex').slice(0, 16)
function sign(id: string, expiry: string) {
  const secret = process.env.BOOKING_ACCESS_SECRET
  if (!secret || secret.length < 32) throw new ServiceUnavailableError('BOOKING_ACCESS_NOT_CONFIGURED')
  return createHmac('sha256', secret).update(`${id}:${expiry}`).digest('hex')
}
export async function grantGuestBookingAccess(id: string) {
  const expiry = String(Date.now() + 30 * 86400000)
  const jar = await cookies()
  jar.set(keyFor(id), `${expiry}.${sign(id, expiry)}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://'), sameSite: 'lax', path: '/', maxAge: 30 * 86400 })
}
export async function canAccessBooking(booking: { id: string; customerId: string | null; guestEmail: string | null }, actor?: Awaited<ReturnType<typeof getCurrentUser>>) {
  const user = actor === undefined ? await getCurrentUser() : actor
  if (ownsBooking(user, booking)) return true
  if (user && user.staffProfile?.active !== false && (canUseAdminModule(user.role, 'bookings') || canUseAdminModule(user.role, 'payments'))) return true
  if (booking.customerId) return false
  const value = (await cookies()).get(keyFor(booking.id))?.value
  if (!value || (process.env.BOOKING_ACCESS_SECRET?.length || 0) < 32) return false
  const [expiry, signature] = value.split('.')
  if (!/^\d+$/.test(expiry) || Number(expiry) <= Date.now() || !/^[a-f0-9]{64}$/.test(signature || '')) return false
  const expected = sign(booking.id, expiry)
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
}
