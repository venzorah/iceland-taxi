// Compatibility exports for existing consumers. Demo cookies no longer grant access.
import { prisma } from '@/lib/prisma'
import { getCurrentUser, getStaffUser } from '@/lib/auth/session'
export async function getDemoStaff() { return getStaffUser() }
export async function getDemoGuestEmail() {
  const user = await getCurrentUser()
  return user?.role === 'CUSTOMER' ? user.email : null
}
export async function getCurrentDriver() {
  const user = await getCurrentUser()
  if (user?.role !== 'DRIVER') return null
  return prisma.driver.findFirst({ where: { userId: user.id, active: true }, include: { user: true, vehicle: true } })
}

export const getDemoDriver = getCurrentDriver
