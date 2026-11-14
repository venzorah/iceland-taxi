import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { apiHandler, jsonOk, jsonError, prisma } from '@/lib/api'
import { getCurrentDriver } from '@/lib/auth/demo'

async function handleGET() {
  const driver = await getCurrentDriver()
  if (!driver) {
    return jsonOk({
      ok: true,
      authenticated: false,
      signInUrl: '/login?next=/driver',
    })
  }
  return jsonOk({
    ok: true,
    authenticated: true,
    driver: {
      id: driver.id,
      displayName: driver.displayName,
      status: driver.status,
      email: driver.user.email,
      phone: driver.user.phone,
      vehicle: driver.vehicle ? { name: driver.vehicle.name, plate: driver.vehicle.plate } : null,
    },
  })
}

export const GET = apiHandler(handleGET)

/** Drivers can update their contact details and availability, never role/assignment/licence approval. */
export const PATCH = apiHandler(async (req: Request) => {
  const driver = await getCurrentDriver()
  if (!driver) return jsonError(401, 'UNAUTHORIZED', 'Active driver account required.')
  const parsed = z.object({ displayName: z.string().trim().min(1).max(100), phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/), status: z.enum(['Available', 'Unavailable']).optional() }).strict().safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter valid contact details and availability.')
  try {
    const result = await prisma.$transaction(async tx => {
      const current = await tx.driver.findFirst({ where: { id: driver.id, active: true } })
      if (!current) return false
      if (parsed.data.status) {
        const ongoing = await tx.booking.count({ where: { driverId: driver.id, status: { in: ['DRIVER_EN_ROUTE', 'IN_PROGRESS'] } } })
        if (ongoing) return false
      }
      await tx.driver.update({ where: { id: driver.id }, data: { displayName: parsed.data.displayName, ...(parsed.data.status ? { status: parsed.data.status } : {}) } })
      await tx.user.update({ where: { id: driver.userId }, data: { name: parsed.data.displayName, phone: parsed.data.phone } })
      return true
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 })
    if (!result) return jsonError(409, 'DRIVER_BUSY', 'Availability cannot change during an active journey. Refresh your account.')
    return jsonOk({ ok: true })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2034') return jsonError(409, 'DRIVER_CHANGED', 'Your assignment changed. Refresh and try again.')
    throw error
  }
})
