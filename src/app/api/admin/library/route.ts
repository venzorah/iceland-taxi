import fs from 'node:fs'
import path from 'node:path'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const FOLDERS = ['photos', 'brand', 'icons']
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 1_500_000

function builtInImages() {
  const root = path.join(process.cwd(), 'public')
  const items: { id: string; name: string; url: string; alt: string; source: 'built-in' }[] = []
  for (const folder of FOLDERS) {
    const dir = path.join(root, folder)
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir)) {
      if (!/\.(png|jpe?g|webp|gif|svg|ico)$/i.test(name)) continue
      items.push({ id: `file:${folder}/${name}`, name, url: `/${folder}/${name}`, alt: '', source: 'built-in' })
    }
  }
  return items.sort((a, b) => a.url.localeCompare(b.url))
}

export async function GET() {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  const uploads = process.env.DATABASE_URL
    ? await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, name: true, alt: true, mime: true } }).catch(() => [])
    : []
  return jsonOk({
    ok: true,
    images: [
      ...uploads.map((item) => ({ id: item.id, name: item.name, url: `/api/media/${item.id}`, alt: item.alt, source: 'upload' as const, mime: item.mime })),
      ...builtInImages(),
    ],
  })
}

export async function POST(req: Request) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const alt = String(form?.get('alt') || '').trim()
  if (!(file instanceof File)) return jsonError(400, 'VALIDATION_ERROR', 'Choose an image file.')
  if (!ALLOWED.has(file.type)) return jsonError(400, 'VALIDATION_ERROR', 'Use a JPEG, PNG, WebP, or GIF image.')
  const data = Buffer.from(await file.arrayBuffer())
  if (data.length < 1 || data.length > MAX_BYTES) return jsonError(400, 'VALIDATION_ERROR', 'Image must be under 1.5 MB.')
  try {
    const asset = await prisma.mediaAsset.create({
      data: { name: file.name.slice(0, 180) || 'image', mime: file.type, alt, data },
      select: { id: true, name: true, alt: true, mime: true },
    })
    return jsonOk({ ok: true, image: { id: asset.id, name: asset.name, url: `/api/media/${asset.id}`, alt: asset.alt, source: 'upload', mime: asset.mime } }, { status: 201 })
  } catch (error) {
    console.error(error)
    return jsonError(503, 'DATABASE_ERROR', 'Could not store the image. Check DATABASE_URL.')
  }
}
