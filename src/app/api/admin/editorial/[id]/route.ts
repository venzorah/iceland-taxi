import { z } from 'zod'

import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  body: z.string().optional(),
  tag: z.string().nullable().optional(),
  dateLabel: z.string().nullable().optional(),
  minutes: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  published: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

async function handlePATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly('editorial')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid page.')
  const post = await prisma.editorialPost.update({ where: { id }, data: parsed.data }).catch(() => null)
  if (!post) return jsonError(404, 'NOT_FOUND', 'Page not found')
  return jsonOk({ ok: true, post })
}

export const PATCH = apiHandler(handlePATCH)
