import { z } from 'zod'

import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const patchSchema = z.object({
  status: z.literal('REFUNDED'),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Choose a refund.')
  const payment = await prisma.payment.findUnique({ where: { id } })
  if (!payment) return jsonError(404, 'NOT_FOUND', 'Payment not found')
  if (payment.status === 'REFUNDED') return jsonOk({ ok: true, payment })
  if (payment.status === 'FAILED' || payment.status === 'REQUIRES_CREDENTIALS') {
    return jsonError(400, 'VALIDATION_ERROR', 'This payment was not captured, so it cannot be refunded.')
  }
  const updated = await prisma.payment.update({ where: { id }, data: { status: 'REFUNDED' } })
  await prisma.booking.update({ where: { id: payment.bookingId }, data: { status: 'REFUNDED' } })
  return jsonOk({ ok: true, payment: updated })
}
