import { cookies } from 'next/headers'
import { MESSAGE_STAFF_ROLES } from '@/lib/messaging/read-state'
import { prisma } from '@/lib/prisma'

export const DRIVER_COOKIE = 'itb_driver_id'
export const STAFF_COOKIE = 'itb_staff'
export const GUEST_EMAIL_COOKIE = 'itb_guest_email'

/** Seeded driver used when the database is not available. */
export const DEMO_DRIVER_ID = 'demo-ari'
export const DEMO_DRIVER_EMAIL = 'ari.driver@example.local'

/** Demo auth only. Replace with real sessions before production. */
export async function getDemoDriver() {
  const jar = await cookies()
  const id = jar.get(DRIVER_COOKIE)?.value
  if (!id) return null
  if (!process.env.DATABASE_URL) {
    if (id !== DEMO_DRIVER_ID) return null
    return {
      id: DEMO_DRIVER_ID,
      displayName: 'Ari Þ.',
      status: 'Available',
      user: { email: DEMO_DRIVER_EMAIL, name: 'Ari Þ.', phone: null },
      vehicle: null,
    }
  }
  return prisma.driver.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true, phone: true } }, vehicle: true },
  })
}

export async function getDemoStaff() {
  const jar = await cookies()
  if (jar.get(STAFF_COOKIE)?.value !== '1') return null
  if (!process.env.DATABASE_URL) return { id: 'demo-staff', email: 'admin@example.local', name: 'Juliet', role: 'SUPER_ADMIN' as const }
  const user = await prisma.user.findFirst({
    where: { role: { in: [...MESSAGE_STAFF_ROLES] } },
    orderBy: { createdAt: 'asc' },
  })
  return user
}

export async function getDemoGuestEmail() {
  const jar = await cookies()
  return jar.get(GUEST_EMAIL_COOKIE)?.value?.toLowerCase() || null
}
