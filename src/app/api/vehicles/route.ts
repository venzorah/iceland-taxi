import { jsonOk, prisma } from '@/lib/api'

/** Active cars a customer can select. Additional cost is upgradeIsk, added to the published trip price. */
export async function GET() {
  if (!process.env.DATABASE_URL) return jsonOk({ ok: true, vehicles: [] })
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { active: true },
      orderBy: [{ upgradeIsk: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, category: true, pax: true, bags: true, upgradeIsk: true },
    })
    return jsonOk({ ok: true, vehicles })
  } catch (error) {
    console.error(error)
    return jsonOk({ ok: true, vehicles: [] })
  }
}
