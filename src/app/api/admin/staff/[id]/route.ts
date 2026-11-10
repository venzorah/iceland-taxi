import { Role } from '@prisma/client'
import { z } from 'zod'

import { STAFF_ROLES } from '@/lib/admin/content'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(STAFF_ROLES).optional(),
  active: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid staff update.')
  const user = await prisma.user.findUnique({ where: { id }, include: { staffProfile: true } })
  if (!user || !STAFF_ROLES.includes(user.role as (typeof STAFF_ROLES)[number])) {
    return jsonError(404, 'NOT_FOUND', 'Staff account not found')
  }
  if (parsed.data.role && parsed.data.role !== 'SUPER_ADMIN' && user.role === 'SUPER_ADMIN') {
    const others = await prisma.user.count({ where: { role: 'SUPER_ADMIN', id: { not: id } } })
    if (others === 0) return jsonError(400, 'VALIDATION_ERROR', 'Keep at least one super admin.')
  }
  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name?.trim(),
      role: parsed.data.role as Role | undefined,
      staffProfile: {
        upsert: {
          create: { active: parsed.data.active ?? true },
          update: { active: parsed.data.active },
        },
      },
    },
    include: { staffProfile: true },
  })
  return jsonOk({
    ok: true,
    staff: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      active: updated.staffProfile?.active ?? true,
    },
  })
}
