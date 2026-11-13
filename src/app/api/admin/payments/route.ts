import { jsonError, jsonOk, prisma } from '@/lib/api'

export async function GET() {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  try {
    const rows = await prisma.payment.findMany({
      select: {
        id: true,
        provider: true,
        status: true,
        currency: true,
        amount: true,
        createdAt: true,
        booking: { select: { ref: true, guestName: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return jsonOk({ ok: true, payments: rows })
  } catch (error) {
    console.error(error)
    return jsonError(503, 'DATABASE_ERROR', 'Could not load payments. Check DATABASE_URL.')
  }
}
