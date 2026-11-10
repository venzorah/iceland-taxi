import { z } from 'zod'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

export async function GET() {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const routes = await prisma.route.findMany({ include: { service: true }, orderBy: { fromIsk: 'asc' } })
  return jsonOk({ ok: true, routes })
}

const createSchema = z.object({
  serviceId: z.string().optional(),
  fromLabel: z.string().min(1),
  toLabel: z.string().min(1),
  minutes: z.number().int().positive().optional(),
  km: z.number().positive().optional(),
  fromIsk: z.number().int().nonnegative(),
  returnTrip: z.boolean().optional(),
  active: z.boolean().optional(),
  override: z.boolean().optional(),
})

export async function POST(req: Request) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid route', { issues: parsed.error.flatten() })
  const route = await prisma.route.create({ data: parsed.data })
  return jsonOk({ ok: true, route }, { status: 201 })
}
