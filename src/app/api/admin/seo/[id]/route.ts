import { z } from 'zod'

import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const patchSchema = z.object({
  path: z.string().min(1).optional(),
  titleEn: z.string().nullable().optional(),
  titleIs: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  descriptionIs: z.string().nullable().optional(),
  noIndex: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid SEO page.')
  const data = { ...parsed.data }
  if (data.path) data.path = data.path.trim().startsWith('/') ? data.path.trim() : `/${data.path.trim()}`
  const page = await prisma.seoPage.update({ where: { id }, data }).catch(() => null)
  if (!page) return jsonError(404, 'NOT_FOUND', 'SEO page not found')
  return jsonOk({ ok: true, page })
}
