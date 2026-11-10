import { ServiceKind } from '@prisma/client'
import { z } from 'zod'
import { jsonError, jsonOk, prisma } from '@/lib/api'

export async function GET() {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const services = await prisma.service.findMany({ orderBy: { sortOrder: 'asc' } })
  return jsonOk({ ok: true, services })
}

const createSchema = z.object({
  slug: z.string().min(1),
  kind: z.nativeEnum(ServiceKind),
  titleEn: z.string().min(1),
  titleIs: z.string().optional(),
  blurbEn: z.string().optional(),
  fromIsk: z.number().int().nonnegative().optional(),
  hoursLabel: z.string().optional(),
  paxLabel: z.string().optional(),
  imageUrl: z.string().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid service', { issues: parsed.error.flatten() })
  const service = await prisma.service.create({ data: parsed.data })
  return jsonOk({ ok: true, service }, { status: 201 })
}
