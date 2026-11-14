import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { DRIVERS } from '@/lib/design/opsData'
import { apiHandler, jsonOk, prisma, withDb } from '@/lib/api'

async function handleGET() {
  const blocked = await rejectDriverOnly('bookings')
  if (blocked) return blocked
  const data = await withDb(
    async () => {
      const drivers = await prisma.driver.findMany({
        include: { vehicle: true, user: { select: { email: true, phone: true, authId: true } } },
        orderBy: { displayName: 'asc' },
      })
      return {
        source: 'database' as const,
        drivers: drivers.map(({ user, ...driver }) => ({
          ...driver,
          hasAccount: Boolean(user.authId),
          user: { email: user.email, phone: user.phone },
        })),
      }
    },
    () => ({
      source: 'seed-fallback' as const,
      drivers: DRIVERS,
      note: 'DATABASE_URL unset or unreachable, serving design ops seed fallback.',
    }),
  )
  return jsonOk({ ok: true, ...data })
}

export const GET = apiHandler(handleGET)
