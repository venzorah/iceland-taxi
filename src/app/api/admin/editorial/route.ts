import { z } from 'zod'

import { slugify } from '@/lib/admin/content'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { listEditorial } from '@/lib/content/editorial-store'

export async function GET() {
  const posts = await listEditorial()
  return jsonOk({ ok: true, posts })
}

const createSchema = z.object({
  kind: z.enum(['blog', 'guide']),
  slug: z.string().optional(),
  title: z.string().min(1),
  excerpt: z.string().optional(),
  body: z.string().optional(),
  tag: z.string().optional(),
  dateLabel: z.string().optional(),
  minutes: z.string().optional(),
  imageUrl: z.string().optional(),
  published: z.boolean().optional(),
})

export async function POST(req: Request) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter a title.')
  const slug = slugify(parsed.data.slug || parsed.data.title)
  const post = await prisma.editorialPost.upsert({
    where: { slug },
    create: {
      slug,
      kind: parsed.data.kind,
      title: parsed.data.title.trim(),
      excerpt: parsed.data.excerpt?.trim() || '',
      body: parsed.data.body?.trim() || '',
      tag: parsed.data.tag?.trim() || null,
      dateLabel: parsed.data.dateLabel?.trim() || null,
      minutes: parsed.data.minutes?.trim() || null,
      imageUrl: parsed.data.imageUrl?.trim() || null,
      published: parsed.data.published ?? false,
    },
    update: {
      kind: parsed.data.kind,
      title: parsed.data.title.trim(),
      excerpt: parsed.data.excerpt?.trim() || '',
      body: parsed.data.body?.trim() || '',
      tag: parsed.data.tag?.trim() || null,
      dateLabel: parsed.data.dateLabel?.trim() || null,
      minutes: parsed.data.minutes?.trim() || null,
      imageUrl: parsed.data.imageUrl?.trim() || null,
      published: parsed.data.published ?? false,
    },
  })
  return jsonOk({ ok: true, post }, { status: 201 })
}
