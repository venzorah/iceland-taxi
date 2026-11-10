import { jsonError, jsonOk } from '@/lib/api'
import { getDemoDriver, getDemoGuestEmail, getDemoStaff } from '@/lib/auth/demo'
import { listMessageAlerts } from '@/lib/messaging/service'
import { vapidConfig } from '@/lib/push/vapid'

/** Ids and booking refs for unread messages. No message bodies. */
export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const as = new URL(req.url).searchParams.get('as')
  const [staff, guestEmail, driver] = await Promise.all([getDemoStaff(), getDemoGuestEmail(), getDemoDriver()])
  const alerts = await listMessageAlerts({
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
