import { z } from 'zod'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  serviceId: z.string().nullable().optional(),
  fromLabel: z.string().min(1).optional(),
  toLabel: z.string().min(1).optional(),
  minutes: z.number().int().positive().nullable().optional(),
  km: z.number().positive().nullable().optional(),
  fromIsk: z.number().int().nonnegative().optional(),
  returnTrip: z.boolean().optional(),
  active: z.boolean().optional(),
  override: z.boolean().optional(),
})

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid patch', { issues: parsed.error.flatten() })
  try {
    const route = await prisma.route.update({ where: { id }, data: parsed.data })
    return jsonOk({ ok: true, route })
  } catch {
    return jsonError(404, 'NOT_FOUND', 'Route not found')
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  try {
    await prisma.booking.updateMany({ where: { routeId: id }, data: { routeId: null } })
    await prisma.route.delete({ where: { id } })
    return jsonOk({ ok: true, deleted: id })
  } catch {
    return jsonError(404, 'NOT_FOUND', 'Route not found')
  }
}
