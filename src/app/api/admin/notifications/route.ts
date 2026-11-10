import { z } from 'zod'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { getDemoStaff } from '@/lib/auth/demo'
import { whatsappCloudCredentials } from '@/lib/env'
import { ensureOfficialWhatsApp } from '@/lib/company-whatsapp'
import { describeWhatsAppFeature } from '@/lib/whatsapp'

const patchSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
})

export async function GET() {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const staff = await getDemoStaff()
  if (!staff) return jsonError(401, 'UNAUTHORIZED', 'Staff session required')

  const whatsappE164 = await ensureOfficialWhatsApp()
  const feature = describeWhatsAppFeature({
    companyE164: whatsappE164,
    cloudConfigured: whatsappCloudCredentials().configured,
  })
  const items = await prisma.staffNotification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
  }).catch(() => [])

  return jsonOk({
    ok: true,
    feature,
    unread: items.filter((item) => !item.read).length,
    items: items.map((item) => ({
      id: item.id,
      bookingRef: item.bookingRef,
      notice: item.notice,
      whatsappUrl: item.whatsappUrl,
      delivery: item.delivery,
      read: item.read,
      createdAt: item.createdAt.toISOString(),
      href: `/messages?ref=${encodeURIComponent(item.bookingRef)}`,
    })),
  })
}

export async function PATCH(req: Request) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const staff = await getDemoStaff()
  if (!staff) return jsonError(401, 'UNAUTHORIZED', 'Staff session required')
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid notification patch')
  if (parsed.data.all) {
    await prisma.staffNotification.updateMany({ where: { read: false }, data: { read: true } })
  } else if (parsed.data.ids?.length) {
    await prisma.staffNotification.updateMany({ where: { id: { in: parsed.data.ids } }, data: { read: true } })
  }
  return jsonOk({ ok: true })
}
