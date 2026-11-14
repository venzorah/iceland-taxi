import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'

async function handleGET() {
  const blocked = await rejectDriverOnly('payments')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const payments = await prisma.payment.findMany({
    include: {
      booking: { select: { ref: true, guestName: true, guestEmail: true, status: true, currency: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return jsonOk({ ok: true, payments })
}

export const GET = apiHandler(handleGET)
