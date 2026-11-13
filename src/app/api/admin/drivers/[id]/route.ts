import { z } from 'zod'

import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { hashPassword } from '@/lib/auth/password'

const patchSchema = z.object({
  displayName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  password: z.string().min(8).optional(),
  licenceNotes: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  status: z.string().optional(),
  active: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Check the driver details. A password needs at least 8 characters.')
  try {
    const current = await prisma.driver.findUnique({ where: { id }, include: { user: true } })
    if (!current) return jsonError(404, 'NOT_FOUND', 'Driver not found')
    const email = parsed.data.email?.trim().toLowerCase()
    if (email && email !== current.user.email) {
      const taken = await prisma.user.findUnique({ where: { email } })
      if (taken) return jsonError(409, 'CONFLICT', 'That email is already used.')
    }
    let status = parsed.data.status?.trim()
    let active = parsed.data.active
    if (status === 'Suspended') active = false
    if (active === true && (status === 'Suspended' || (!status && current.status === 'Suspended'))) status = 'Available'
    if (active === false && !status) status = 'Suspended'
    const passwordHash = parsed.data.password ? await hashPassword(parsed.data.password) : undefined
    const driver = await prisma.driver.update({
      where: { id },
      data: {
        displayName: parsed.data.displayName?.trim(),
        licenceNotes: parsed.data.licenceNotes === undefined ? undefined : parsed.data.licenceNotes?.trim() || null,
        vehicle: parsed.data.vehicleId === undefined ? undefined : parsed.data.vehicleId ? { connect: { id: parsed.data.vehicleId } } : { disconnect: true },
        status,
        active,
        user: {
          update: {
            name: parsed.data.displayName?.trim(),
            email,
            phone: parsed.data.phone === undefined ? undefined : parsed.data.phone?.trim() || null,
            passwordHash,
          },
        },
      },
    })
    return jsonOk({ ok: true, driver: { ...driver, hasPassword: Boolean(passwordHash || current.user.passwordHash) } })
  } catch (error) {
    console.error(error)
    return jsonError(503, 'DATABASE_ERROR', 'Could not save the driver. Check DATABASE_URL.')
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  try {
    const driver = await prisma.driver.findUnique({ where: { id }, select: { id: true, userId: true } })
    if (!driver) return jsonError(404, 'NOT_FOUND', 'Driver not found')
    await prisma.$transaction([
      prisma.booking.updateMany({ where: { driverId: id }, data: { driverId: null } }),
      prisma.user.delete({ where: { id: driver.userId } }),
    ])
    return jsonOk({ ok: true })
  } catch (error) {
    console.error(error)
    return jsonError(503, 'DATABASE_ERROR', 'Could not delete the driver. Check DATABASE_URL.')
  }
}
