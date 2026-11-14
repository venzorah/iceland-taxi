import { apiHandler, jsonError, jsonOk } from '@/lib/api'
import { getCurrentDriver } from '@/lib/auth/demo'
import { listDriverBookings } from '@/lib/driver/service'

async function handleGET() {
  const driver = await getCurrentDriver()
  if (!driver) return jsonError(401, 'UNAUTHORIZED', 'Driver login required')
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'Database connection required.')
  const jobs = await listDriverBookings(driver.id)
  const active = jobs.filter((j) => ['DRIVER_ASSIGNED', 'ACKNOWLEDGED', 'DRIVER_EN_ROUTE', 'IN_PROGRESS'].includes(j.status))
  const history = jobs.filter((j) => ['COMPLETED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'].includes(j.status))
  return jsonOk({ ok: true, driverId: driver.id, jobs, active, history })
}

export const GET = apiHandler(handleGET)
