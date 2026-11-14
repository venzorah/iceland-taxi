import { z } from 'zod'

import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  pax: z.number().int().positive().optional(),
  bags: z.number().int().nonnegative().optional(),
  plate: z.string().nullable().optional(),
  upgradeIsk: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

async function handlePATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly('vehicles')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(error => { if (error.code === 'P2025') return null; throw error }))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid vehicle.')
  const vehicle = await prisma.vehicle.update({ where: { id }, data: parsed.data }).catch(error => { if (error.code === 'P2025') return null; throw error })
  if (!vehicle) return jsonError(404, 'NOT_FOUND', 'Vehicle not found')
  return jsonOk({ ok: true, vehicle })
}

export const PATCH = apiHandler(handlePATCH)
