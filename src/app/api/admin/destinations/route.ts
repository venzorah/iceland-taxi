import { z } from 'zod'

import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

async function handleGET() {
  const blocked = await rejectDriverOnly('destinations')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const destinations = await prisma.destination.findMany({ orderBy: { sortOrder: 'asc' } })
  return jsonOk({ ok: true, destinations })
}

const createSchema = z.object({
  name: z.string().min(1),
  note: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  active: z.boolean().optional(),
})

async function handlePOST(req: Request) {
  const blocked = await rejectDriverOnly('destinations')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter a destination name.')
  const count = await prisma.destination.count()
  const destination = await prisma.destination.create({
    data: {
      name: parsed.data.name.trim(),
      note: parsed.data.note?.trim() || null,
      imageUrl: parsed.data.imageUrl?.trim() || null,
      active: parsed.data.active ?? true,
      sortOrder: count + 1,
    },
  })
  return jsonOk({ ok: true, destination }, { status: 201 })
}

export const GET = apiHandler(handleGET)
export const POST = apiHandler(handlePOST)
