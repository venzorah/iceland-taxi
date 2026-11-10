import { DRIVERS } from '@/lib/design/opsData'
import { jsonOk, prisma, withDb } from '@/lib/api'

export async function GET() {
  const data = await withDb(
    async () => {
      const drivers = await prisma.driver.findMany({
        include: { vehicle: true, user: { select: { email: true, phone: true } } },
        orderBy: { displayName: 'asc' },
      })
      return { source: 'database' as const, drivers }
    },
    () => ({
      source: 'seed-fallback' as const,
      drivers: DRIVERS,
      note: 'DATABASE_URL unset or unreachable, serving design ops seed fallback.',
    }),
  )
  return jsonOk({ ok: true, ...data })
}
