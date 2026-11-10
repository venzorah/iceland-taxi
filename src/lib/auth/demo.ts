import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const DRIVER_COOKIE = 'itb_driver_id'
export const STAFF_COOKIE = 'itb_staff'
export const GUEST_EMAIL_COOKIE = 'itb_guest_email'

/** Demo auth only — replace with real sessions before production. */
export async function getDemoDriver() {
  const jar = await cookies()
  const id = jar.get(DRIVER_COOKIE)?.value
  if (!id || !process.env.DATABASE_URL) return null
  return prisma.driver.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true, phone: true } }, vehicle: true },
  })
}

export async function getDemoStaff() {
  const jar = await cookies()
  if (jar.get(STAFF_COOKIE)?.value !== '1') return null
  if (!process.env.DATABASE_URL) return { id: 'demo-staff', email: 'admin@example.local', name: 'Demo admin', role: 'SUPER_ADMIN' as const }
  const user = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'BOOKING_MANAGER', 'STAFF'] } },
    orderBy: { createdAt: 'asc' },
  })
  return user
}

export async function getDemoGuestEmail() {
  const jar = await cookies()
  return jar.get(GUEST_EMAIL_COOKIE)?.value?.toLowerCase() || null
}
