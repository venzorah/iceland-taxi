import { prisma } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  if (!process.env.DATABASE_URL) return new Response('Not found', { status: 404 })
  const { id } = await ctx.params
  const asset = await prisma.mediaAsset.findUnique({ where: { id } }).catch(() => null)
  if (!asset) return new Response('Not found', { status: 404 })
  return new Response(asset.data, {
    headers: {
      'content-type': asset.mime,
      'cache-control': 'public, max-age=86400',
    },
  })
}
