import { jsonError, jsonOk } from '@/lib/api'
import { getDemoDriver } from '@/lib/auth/demo'
import { advanceDriverBooking } from '@/lib/driver/service'

type Ctx = { params: Promise<{ ref: string }> }

export async function PATCH(_req: Request, ctx: Ctx) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const driver = await getDemoDriver()
  if (!driver) return jsonError(401, 'UNAUTHORIZED', 'Driver login required')
  const { ref } = await ctx.params
  const result = await advanceDriverBooking(driver.id, ref)
  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'FORBIDDEN' ? 403 : 409
    return jsonError(status, result.code, result.message, {
      conflicts: 'conflicts' in result ? result.conflicts : undefined,
    })
  }
  return jsonOk({ ok: true, job: result.job, booking: result.booking })
}
