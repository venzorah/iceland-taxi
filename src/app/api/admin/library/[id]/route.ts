import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

type Ctx = { params: Promise<{ id: string }> }

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
