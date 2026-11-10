import { jsonError, jsonOk } from '@/lib/api'
import { getDemoDriver } from '@/lib/auth/demo'
import { listDriverBookings } from '@/lib/driver/service'

export async function GET() {
  const driver = await getDemoDriver()
  if (!driver) return jsonError(401, 'UNAUTHORIZED', 'Driver login required')
  if (!process.env.DATABASE_URL) return jsonOk({ ok: true, driverId: driver.id, jobs: [], active: [], history: [] })
  const jobs = await listDriverBookings(driver.id)
  const active = jobs.filter((j) => !['COMPLETED', 'CANCELLED'].includes(j.status))
  const history = jobs.filter((j) => j.status === 'COMPLETED')
  return jsonOk({ ok: true, driverId: driver.id, jobs, active, history })
}
