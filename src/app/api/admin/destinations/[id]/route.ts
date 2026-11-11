import { z } from 'zod'

import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  note: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  active: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid destination.')
  const data = { ...parsed.data }
  if (data.name) data.name = data.name.trim()
  if (data.note !== undefined) data.note = data.note?.trim() || null
  if (data.imageUrl !== undefined) data.imageUrl = data.imageUrl?.trim() || null
  const destination = await prisma.destination.update({ where: { id }, data }).catch(() => null)
  if (!destination) return jsonError(404, 'NOT_FOUND', 'Destination not found')
  return jsonOk({ ok: true, destination })
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const destination = await prisma.destination.delete({ where: { id } }).catch(() => null)
  if (!destination) return jsonError(404, 'NOT_FOUND', 'Destination not found')
  return jsonOk({ ok: true, deleted: id })
}
