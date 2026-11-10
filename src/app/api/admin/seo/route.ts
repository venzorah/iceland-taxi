import { z } from 'zod'

import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

export async function GET() {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const pages = await prisma.seoPage.findMany({ orderBy: { path: 'asc' } })
  return jsonOk({ ok: true, pages })
}

const createSchema = z.object({
  path: z.string().min(1),
  titleEn: z.string().nullable().optional(),
  titleIs: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  descriptionIs: z.string().nullable().optional(),
  noIndex: z.boolean().optional(),
})

export async function POST(req: Request) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter a path such as /airport-transfer.')
  const path = parsed.data.path.trim().startsWith('/') ? parsed.data.path.trim() : `/${parsed.data.path.trim()}`
  const page = await prisma.seoPage.create({ data: { ...parsed.data, path } }).catch(() => null)
  if (!page) return jsonError(409, 'CONFLICT', 'That path is already saved.')
  return jsonOk({ ok: true, page }, { status: 201 })
}
