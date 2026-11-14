import { getCurrentUser } from '@/lib/auth/session'
import { canUseAdminModule } from '@/lib/auth/permissions'
import { prisma } from '@/lib/prisma'

/** Driver conversations are private to operations and the currently assigned active driver. */
export async function driverConversationAccess(ref: string) {
  const user = await getCurrentUser()
  if (!user) return null
  const booking = await prisma.booking.findUnique({ where: { ref }, select: { id: true, driverId: true } })
  if (!booking?.driverId) return null
  const staff = user.staffProfile?.active !== false && canUseAdminModule(user.role, 'bookings')
  if (staff) return { booking, user, role: 'staff' as const }
  if (user.role !== 'DRIVER') return null
  const driver = await prisma.driver.findFirst({ where: { id: booking.driverId, userId: user.id, active: true } })
  return driver ? { booking, user, role: 'driver' as const } : null
}
