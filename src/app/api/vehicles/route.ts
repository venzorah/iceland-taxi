import { apiHandler, jsonOk, prisma, ServiceUnavailableError } from '@/lib/api'

/** Active cars a customer can select. Additional cost is upgradeIsk, added to the published trip price. */
async function handleGET() {
  if (!process.env.DATABASE_URL) throw new ServiceUnavailableError()
  const vehicles = await prisma.vehicle.findMany({
      where: { active: true },
      orderBy: [{ upgradeIsk: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, category: true, pax: true, bags: true, upgradeIsk: true },
    })
  return jsonOk({ ok: true, vehicles })
}

export const GET = apiHandler(handleGET)
