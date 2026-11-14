import { z } from 'zod'
import { apiHandler, jsonError, jsonOk } from '@/lib/api'
import { getDemoDriver, getDemoGuestEmail, getDemoStaff } from '@/lib/auth/demo'
import { prisma } from '@/lib/prisma'
import { vapidConfig } from '@/lib/push/vapid'

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

/** Store a push subscription for each signed-in surface. No message content. */
async function handlePOST(req: Request) {
  if (!vapidConfig().enabled) {
    return jsonError(503, 'PUSH_NOT_CONFIGURED', 'VAPID keys are not set. Open-tab alerts still work.')
  }
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid push subscription')

  const [staff, guestEmail, driver] = await Promise.all([getDemoStaff(), getDemoGuestEmail(), getDemoDriver()])
  const audiences: Array<{ audience: string; guestEmail?: string; driverId?: string }> = []
  if (staff) audiences.push({ audience: 'staff' })
  if (guestEmail) audiences.push({ audience: 'customer', guestEmail })
  if (driver) audiences.push({ audience: 'driver', driverId: driver.id })
  if (audiences.length === 0) return jsonError(401, 'UNAUTHORIZED', 'Sign in as a customer, staff member, or driver first')

  try {
    for (const row of audiences) {
      await prisma.pushSubscription.upsert({
        where: { endpoint_audience: { endpoint: parsed.data.endpoint, audience: row.audience } },
        create: {
          endpoint: parsed.data.endpoint,
          p256dh: parsed.data.keys.p256dh,
          auth: parsed.data.keys.auth,
          audience: row.audience,
          guestEmail: row.guestEmail,
          driverId: row.driverId,
        },
        update: {
          p256dh: parsed.data.keys.p256dh,
          auth: parsed.data.keys.auth,
          guestEmail: row.guestEmail,
          driverId: row.driverId,
        },
      })
    }
  } catch {
    return jsonError(503, 'PUSH_STORE_FAILED', 'Could not store the push subscription')
  }

  return jsonOk({ ok: true, audiences: audiences.map((a) => a.audience) })
}

/** Remove only the signed-in account's subscription before browser unsubscription. */
async function handleDELETE(req: Request) {
  const parsed = z.object({ endpoint: z.string().url() }).safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'A subscription endpoint is required.')
  const [staff, guestEmail, driver] = await Promise.all([getDemoStaff(), getDemoGuestEmail(), getDemoDriver()])
  const owners = [
    ...(staff ? [{ audience: 'staff' }] : []),
    ...(guestEmail ? [{ audience: 'customer', guestEmail }] : []),
    ...(driver ? [{ audience: 'driver', driverId: driver.id }] : []),
  ]
  if (!owners.length) return jsonError(401, 'UNAUTHORIZED', 'Sign in first.')
  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, OR: owners } })
    return jsonOk({ ok: true })
  } catch { return jsonError(503, 'PUSH_STORE_FAILED', 'Could not turn off notifications. Please try again.') }
}

export const POST = apiHandler(handlePOST)
export const DELETE = apiHandler(handleDELETE)
