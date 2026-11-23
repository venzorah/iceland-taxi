import { createRouteSchema } from '@/lib/admin/route-schema'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

async function handleGET() {
  const blocked = await rejectDriverOnly('routes')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const [routes, services, destinations] = await Promise.all([
    prisma.route.findMany({ include: { service: { select: { id: true, titleEn: true, active: true } } }, orderBy: { fromIsk: 'asc' } }),
    prisma.service.findMany({ select: { id: true, titleEn: true, active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.destination.findMany({ where: { active: true }, select: { name: true }, orderBy: { sortOrder: 'asc' } }),
  ])
  return jsonOk({ ok: true, routes, services, destinations })
}


async function handlePOST(req: Request) {
  const blocked = await rejectDriverOnly('routes')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const body = await req.json().catch(() => null)
  const parsed = createRouteSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid route', { issues: parsed.error.flatten() })
  if (parsed.data.serviceId && !await prisma.service.findUnique({ where: { id: parsed.data.serviceId }, select: { id: true } })) return jsonError(400, 'VALIDATION_ERROR', 'Choose an existing service.')
  const route = await prisma.route.create({ data: parsed.data })
  return jsonOk({ ok: true, route }, { status: 201 })
}

export const GET = apiHandler(handleGET)
export const POST = apiHandler(handlePOST)
