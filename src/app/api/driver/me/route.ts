import { jsonError, jsonOk } from '@/lib/api'
import { getDemoDriver } from '@/lib/auth/demo'

export async function GET() {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const driver = await getDemoDriver()
  if (!driver) {
    return jsonOk({
      ok: true,
      authenticated: false,
      demoHint: 'POST /api/driver/auth with { "email": "ari.driver@example.local" }',
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
      vehicle: driver.vehicle,
    },
  })
}
