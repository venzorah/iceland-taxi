import { z } from 'zod'
import { jsonError, jsonOk, prisma } from '@/lib/api'

export async function GET() {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const [extras, rate, vehicles] = await Promise.all([
    prisma.pricingExtra.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.exchangeRate.findFirst({ orderBy: { effective: 'desc' } }),
    prisma.vehicle.findMany({ orderBy: { name: 'asc' } }),
  ])
  return jsonOk({ ok: true, extras, rate, vehicles })
}

const patchExtraSchema = z.object({
  type: z.literal('extra').optional(),
  id: z.string().optional(),
  key: z.string().min(1),
  labelEn: z.string().min(1),
  labelIs: z.string().optional(),
  isk: z.number().int(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

const rateSchema = z.object({
  type: z.literal('rate'),
  iskPerUsd: z.number().positive(),
})

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const body = await req.json().catch(() => null)

  if (body?.type === 'rate') {
    const parsed = rateSchema.safeParse(body)
    if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid exchange rate', { issues: parsed.error.flatten() })
    const rate = await prisma.exchangeRate.create({
      data: { iskPerUsd: Math.round(parsed.data.iskPerUsd), note: 'admin' },
    })
    return jsonOk({ ok: true, rate })
  }

  const parsed = patchExtraSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid pricing extra', { issues: parsed.error.flatten() })

  const extra = await prisma.pricingExtra.upsert({
    where: { key: parsed.data.key },
    create: {
      key: parsed.data.key,
      labelEn: parsed.data.labelEn,
      labelIs: parsed.data.labelIs,
      isk: parsed.data.isk,
      active: parsed.data.active ?? true,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
    update: {
      labelEn: parsed.data.labelEn,
      labelIs: parsed.data.labelIs,
      isk: parsed.data.isk,
      active: parsed.data.active,
      sortOrder: parsed.data.sortOrder,
    },
  })
  return jsonOk({ ok: true, extra })
}
