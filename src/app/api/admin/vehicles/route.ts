import { z } from 'zod'

import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

async function handleGET() {
  const blocked = await rejectDriverOnly('vehicles')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const vehicles = await prisma.vehicle.findMany({ orderBy: { name: 'asc' }, include: { drivers: { select: { displayName: true } } } })
  return jsonOk({ ok: true, vehicles })
}

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  pax: z.number().int().positive(),
  bags: z.number().int().nonnegative(),
  plate: z.string().nullable().optional(),
  useCase: z.string().nullable().optional(),
  upgradeIsk: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
})

async function handlePOST(req: Request) {
  const blocked = await rejectDriverOnly('vehicles')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter the vehicle name, category, seats and bags.')
  const vehicle = await prisma.vehicle.create({
    data: {
      name: parsed.data.name.trim(),
      category: parsed.data.category.trim(),
      pax: parsed.data.pax,
      bags: parsed.data.bags,
      plate: parsed.data.plate?.trim() || null,
      useCase: parsed.data.useCase?.trim() || null,
      upgradeIsk: parsed.data.upgradeIsk ?? 0,
      active: parsed.data.active ?? true,
    },
  })
  return jsonOk({ ok: true, vehicle }, { status: 201 })
}

export const GET = apiHandler(handleGET)
export const POST = apiHandler(handlePOST)
