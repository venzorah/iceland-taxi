import { announcementWrites, announcementsFromRows, barFromJson, barWrite } from '@/lib/admin/content'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { ANNOUNCEMENTS_SEED, type AnnouncementState } from '@/lib/design/announcements'

async function load() {
  if (!process.env.DATABASE_URL) return { source: 'seed' as const, announcements: ANNOUNCEMENTS_SEED }
  const theme = await prisma.themeSettings.findUnique({ where: { id: 'singleton' } })
  const bar = barFromJson(theme?.announcementBar)
  if (!bar?.managed) return { source: 'seed' as const, announcements: ANNOUNCEMENTS_SEED }
  const rows = await prisma.announcement.findMany({ orderBy: { sortOrder: 'asc' } })
  return { source: 'database' as const, announcements: announcementsFromRows(rows, bar) }
}

async function handleGET() {
  const data = await load()
  return jsonOk({ ok: true, ...data })
}

async function handlePUT(req: Request) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const body = (await req.json().catch(() => null)) as AnnouncementState | null
  if (!body?.settings || !Array.isArray(body.items)) return jsonError(400, 'VALIDATION_ERROR', 'Invalid announcements.')
  const writes = announcementWrites(body)
  await prisma.$transaction([
    prisma.announcement.deleteMany(),
    prisma.announcement.createMany({ data: writes }),
    prisma.themeSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', announcementBar: barWrite(body) },
      update: { announcementBar: barWrite(body) },
    }),
  ])
  const saved = await load()
  return jsonOk({ ok: true, ...saved })
}

export const GET = apiHandler(handleGET)
export const PUT = apiHandler(handlePUT)
