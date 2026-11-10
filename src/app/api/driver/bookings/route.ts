import { jsonError, jsonOk } from '@/lib/api'
import { getDemoDriver } from '@/lib/auth/demo'
import { listDriverBookings } from '@/lib/driver/service'

export async function GET() {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const driver = await getDemoDriver()
  if (!driver) return jsonError(401, 'UNAUTHORIZED', 'Driver login required')
  const jobs = await listDriverBookings(driver.id)
  const active = jobs.filter((j) => !['COMPLETED', 'CANCELLED'].includes(j.status))
  const history = jobs.filter((j) => j.status === 'COMPLETED')
  return jsonOk({ ok: true, driverId: driver.id, jobs, active, history })
}
