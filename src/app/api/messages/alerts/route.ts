import { apiHandler, jsonError, jsonOk } from '@/lib/api'
import { canUseAdminModule } from '@/lib/auth/permissions'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { listMessageAlerts } from '@/lib/messaging/service'
import { vapidConfig } from '@/lib/push/vapid'

/** Ids and booking refs for unread messages. No message bodies. */
async function handleGET(req: Request) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const as = new URL(req.url).searchParams.get('as')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'UNAUTHORIZED', 'Sign in to view message alerts.')
  const staff = canUseAdminModule(user.role, 'bookings') && user.staffProfile?.active !== false
  const guestEmail = user.role === 'CUSTOMER' ? user.email : null
  const driver = user.role === 'DRIVER' ? await prisma.driver.findFirst({ where: { userId: user.id, active: true }, select: { id: true } }) : null
  const alerts = await listMessageAlerts({
    customerId: user.role === 'CUSTOMER' ? user.id : null,
    staff: Boolean(staff) && as !== 'customer' && as !== 'driver',
    guestEmail: as === 'staff' || as === 'driver' ? null : guestEmail,
    driverId: as === 'staff' || as === 'customer' ? null : driver?.id || null,
  })
  const push = vapidConfig()
  return jsonOk({
    ok: true,
    viewer: alerts.viewer,
    items: alerts.items,
    push: push.enabled,
  })
}

export const GET = apiHandler(handleGET)
