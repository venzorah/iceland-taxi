import { z } from 'zod'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { normalizeStoredE164 } from '@/lib/whatsapp'

export async function GET() {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const company = await prisma.companySettings.findUnique({ where: { id: 'singleton' } })
  return jsonOk({ ok: true, company })
}

const patchSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsappE164: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  registrationNumber: z.string().nullable().optional(),
  vatNumber: z.string().nullable().optional(),
  aboutEn: z.string().nullable().optional(),
  aboutIs: z.string().nullable().optional(),
  testimonialsEnabled: z.boolean().optional(),
})

/** Admin CMS company profile — never invent missing contacts. */
export async function PATCH(req: Request) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid company patch', { issues: parsed.error.flatten() })
  const data = { ...parsed.data }
  if (data.whatsappE164 !== undefined) {
    if (data.whatsappE164 === null || data.whatsappE164.trim() === '') {
      data.whatsappE164 = null
    } else {
      const normalized = normalizeStoredE164(data.whatsappE164)
      if (!normalized) {
        return jsonError(400, 'VALIDATION_ERROR', 'Enter the official WhatsApp number in international format, starting with +.')
      }
      data.whatsappE164 = normalized
    }
  }
  const company = await prisma.companySettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', displayName: data.displayName || 'Iceland Taxi Booking', ...data },
    update: data,
  })
  return jsonOk({ ok: true, company })
}
