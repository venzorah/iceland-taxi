import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 1_500_000

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  if (id.startsWith('file:')) return jsonError(400, 'VALIDATION_ERROR', 'Built-in images are replaced from Website content by uploading a new photo.')
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return jsonError(400, 'VALIDATION_ERROR', 'Choose an image file.')
  if (!ALLOWED.has(file.type)) return jsonError(400, 'VALIDATION_ERROR', 'Use a JPEG, PNG, WebP, or GIF image.')
  const data = Buffer.from(await file.arrayBuffer())
  if (data.length < 1 || data.length > MAX_BYTES) return jsonError(400, 'VALIDATION_ERROR', 'Image must be under 1.5 MB.')
  const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true } })
  if (!asset) return jsonError(404, 'NOT_FOUND', 'Image not found')
  await prisma.mediaAsset.update({
    where: { id },
    data: { name: file.name.slice(0, 180) || 'image', mime: file.type, data },
  })
  return jsonOk({ ok: true, image: { id, name: file.name, url: `/api/media/${id}` } })
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  if (id.startsWith('file:')) return jsonError(400, 'VALIDATION_ERROR', 'Built-in images stay in the library.')
  const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true } })
  if (!asset) return jsonError(404, 'NOT_FOUND', 'Image not found')
  const url = `/api/media/${id}`
  await prisma.siteBlock.deleteMany({ where: { value: url } })
  await prisma.mediaAsset.delete({ where: { id } })
  return jsonOk({ ok: true })
}
