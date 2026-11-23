import { updateRouteSchema } from '@/lib/admin/route-schema'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

type Ctx = { params: Promise<{ id: string }> }


async function handlePATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly('routes')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = updateRouteSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid patch', { issues: parsed.error.flatten() })
  if (parsed.data.serviceId && !await prisma.service.findUnique({ where: { id: parsed.data.serviceId }, select: { id: true } })) return jsonError(400, 'VALIDATION_ERROR', 'Choose an existing service.')
  try {
    const route = await prisma.route.update({ where: { id }, data: parsed.data })
    return jsonOk({ ok: true, route })
  } catch (error) {
    if ((error as { code?: string }).code !== 'P2025') throw error
    return jsonError(404, 'NOT_FOUND', 'Route not found')
  }
}

async function handleDELETE(_req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly('routes')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  try {
    await prisma.$transaction(async tx => {
      await tx.booking.updateMany({ where: { routeId: id }, data: { routeId: null } })
      await tx.route.delete({ where: { id } })
    })
    return jsonOk({ ok: true, deleted: id })
  } catch (error) {
    if ((error as { code?: string }).code !== 'P2025') throw error
    return jsonError(404, 'NOT_FOUND', 'Route not found')
  }
}

export const PATCH = apiHandler(handlePATCH)
export const DELETE = apiHandler(handleDELETE)
