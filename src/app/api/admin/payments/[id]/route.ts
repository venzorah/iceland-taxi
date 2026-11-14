import { z } from 'zod'

import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const patchSchema = z.object({
  status: z.literal('REFUNDED'),
})

type Ctx = { params: Promise<{ id: string }> }

async function handlePATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly('payments')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Choose a refund.')
  const payment = await prisma.payment.findUnique({ where: { id } })
  if (!payment) return jsonError(404, 'NOT_FOUND', 'Payment not found')
  if (payment.status === 'REFUNDED') return jsonOk({ ok: true, payment })
  return jsonError(409, 'REFUND_PROCESSING_UNAVAILABLE', 'Refund processing is not connected yet. No money was moved and the payment record was not changed.')
}

export const PATCH = apiHandler(handlePATCH)
