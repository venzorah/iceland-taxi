import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'

async function handleGET(req: Request) {
  const blocked = await rejectDriverOnly('payments')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  try {
    const cursor = new URL(req.url).searchParams.get('cursor')
    if (cursor && !/^[a-zA-Z0-9_-]{1,128}$/.test(cursor)) return jsonError(400, 'VALIDATION_ERROR', 'Invalid page.')
    const page = await prisma.payment.findMany({
      select: {
        id: true,
        provider: true,
        status: true,
        currency: true,
        amount: true,
        createdAt: true,
        booking: { select: { ref: true, guestName: true, status: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: 101,
    })
    const rows = page.slice(0, 100)
    return jsonOk({ ok: true, payments: rows, nextCursor: page.length > 100 ? rows.at(-1)?.id : null })
  } catch {
    console.error('[operation] Failed; private error details suppressed.')
    return jsonError(503, 'DATABASE_ERROR', 'Could not load payments. Check DATABASE_URL.')
  }
}

export const GET = apiHandler(handleGET)
