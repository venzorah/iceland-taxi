import { z } from 'zod'
import { jsonError, jsonOk, prisma } from '@/lib/api'

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
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid company patch', { issues: parsed.error.flatten() })
  const company = await prisma.companySettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', displayName: parsed.data.displayName || 'Iceland Taxi Booking', ...parsed.data },
    update: parsed.data,
  })
  return jsonOk({ ok: true, company })
}
