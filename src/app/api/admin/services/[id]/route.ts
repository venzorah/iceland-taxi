import { ServiceKind } from '@prisma/client'
import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  kind: z.nativeEnum(ServiceKind).optional(),
  titleEn: z.string().min(1).optional(),
  titleIs: z.string().nullable().optional(),
  blurbEn: z.string().nullable().optional(),
  fromIsk: z.number().int().nonnegative().nullable().optional(),
  hoursLabel: z.string().nullable().optional(),
  paxLabel: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

async function handlePATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly('services')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid patch', { issues: parsed.error.flatten() })
  try {
    const service = await prisma.service.update({ where: { id }, data: parsed.data })
    return jsonOk({ ok: true, service })
  } catch {
    return jsonError(404, 'NOT_FOUND', 'Service not found')
  }
}

async function handleDELETE(_req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly('services')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  try {
    await prisma.service.update({ where: { id }, data: { active: false } })
    return jsonOk({ ok: true, deactivated: true })
  } catch {
    return jsonError(404, 'NOT_FOUND', 'Service not found')
  }
}

export const PATCH = apiHandler(handlePATCH)
export const DELETE = apiHandler(handleDELETE)
