import { createServiceSchema } from '@/lib/admin/service-schema'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

async function handleGET() {
  const blocked = await rejectDriverOnly('services')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const services = await prisma.service.findMany({ orderBy: { sortOrder: 'asc' } })
  return jsonOk({ ok: true, services })
}


async function handlePOST(req: Request) {
  const blocked = await rejectDriverOnly('services')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const body = await req.json().catch(() => null)
  const parsed = createServiceSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid service', { issues: parsed.error.flatten() })
  let service
  try { service = await prisma.service.create({ data: parsed.data }) } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return jsonError(409, 'DUPLICATE_SLUG', 'That service identifier is already in use.')
    throw error
  }
  return jsonOk({ ok: true, service }, { status: 201 })
}

export const GET = apiHandler(handleGET)
export const POST = apiHandler(handlePOST)
