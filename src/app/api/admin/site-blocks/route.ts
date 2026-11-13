import { z } from 'zod'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { SITE_BLOCKS, SITE_DEFAULTS } from '@/lib/content/blocks'

export async function GET() {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  const saved = process.env.DATABASE_URL
    ? await prisma.siteBlock.findMany().catch(() => [])
    : []
  const overrides = Object.fromEntries(saved.map((row) => [row.key, row.value]))
  return jsonOk({
    ok: true,
    blocks: SITE_BLOCKS.map((block) => ({
      ...block,
      value: overrides[block.key] ?? block.value,
      custom: Object.prototype.hasOwnProperty.call(overrides, block.key),
    })),
  })
}

const putSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})

export async function PUT(req: Request) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const parsed = putSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Choose a field to save.')
  const known = SITE_BLOCKS.find((block) => block.key === parsed.data.key)
  if (!known) return jsonError(400, 'VALIDATION_ERROR', 'That field is not on the public site.')
  const value = parsed.data.value.trim()
  try {
    if (!value || value === SITE_DEFAULTS[known.key]) {
      await prisma.siteBlock.deleteMany({ where: { key: known.key } })
      return jsonOk({ ok: true, value: SITE_DEFAULTS[known.key], custom: false })
    }
    await prisma.siteBlock.upsert({
      where: { key: known.key },
      create: { key: known.key, value },
      update: { value },
    })
    return jsonOk({ ok: true, value, custom: true })
  } catch (error) {
    console.error(error)
    return jsonError(503, 'DATABASE_ERROR', 'Could not save. Check DATABASE_URL.')
  }
}
