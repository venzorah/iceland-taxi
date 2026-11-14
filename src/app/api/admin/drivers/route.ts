import { z } from 'zod'

import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const createSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  licenceNotes: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  status: z.string().optional(),
  active: z.boolean().optional(),
}).strict()

async function handlePOST(req: Request) {
  const blocked = await rejectDriverOnly('drivers')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter the driver name and email.')
  const email = parsed.data.email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return jsonError(409, 'CONFLICT', 'That email is already used.')
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.displayName.trim(),
      phone: parsed.data.phone?.trim() || null,
      role: 'DRIVER',
      driver: {
        create: {
          displayName: parsed.data.displayName.trim(),
          licenceNotes: parsed.data.licenceNotes?.trim() || null,
          vehicleId: parsed.data.vehicleId || null,
          status: parsed.data.active === false ? 'Suspended' : parsed.data.status?.trim() || 'Available',
          active: parsed.data.active !== false && parsed.data.status?.trim() !== 'Suspended',
        },
      },
    },
    include: { driver: true },
  })
  try {
    const { notifyAccountCreated } = await import('@/lib/email/notices')
    await notifyAccountCreated(user)
  } catch (error) {
    console.error(error)
  }
  return jsonOk({ ok: true, driver: user.driver }, { status: 201 })
}

export const POST = apiHandler(handlePOST)
