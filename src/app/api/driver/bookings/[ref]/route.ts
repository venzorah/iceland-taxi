import { z } from 'zod'
import { BookingStatus } from '@prisma/client'
import { apiHandler, jsonError, jsonOk } from '@/lib/api'
import { getCurrentDriver } from '@/lib/auth/demo'
import { advanceDriverBooking } from '@/lib/driver/service'

type Ctx = { params: Promise<{ ref: string }> }

async function handlePATCH(req: Request, ctx: Ctx) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const driver = await getCurrentDriver()
  if (!driver) return jsonError(401, 'UNAUTHORIZED', 'Driver login required')
  const { ref } = await ctx.params
  const parsed = z.object({ expectedStatus: z.nativeEnum(BookingStatus) }).strict().safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Refresh the journey and submit its current status.')
  const result = await advanceDriverBooking(driver.id, ref, parsed.data.expectedStatus)
  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : 409
    return jsonError(status, result.code, result.message, {

    })
  }
  return jsonOk({ ok: true, job: result.job })
}

export const PATCH = apiHandler(handlePATCH)
