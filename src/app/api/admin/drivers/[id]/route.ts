import { z } from 'zod'

import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const patchSchema = z.object({
  displayName: z.string().min(1).optional(),
  licenceNotes: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  status: z.string().optional(),
  active: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid driver.')
  const driver = await prisma.driver.update({ where: { id }, data: parsed.data }).catch(() => null)
  if (!driver) return jsonError(404, 'NOT_FOUND', 'Driver not found')
  return jsonOk({ ok: true, driver })
}
