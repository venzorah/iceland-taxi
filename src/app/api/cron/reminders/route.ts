import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { sendDueReminders } from '@/lib/email/reminders'

function allowed(req: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

async function run(req: Request) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required')
  if (!allowed(req)) return jsonError(401, 'UNAUTHORIZED', 'CRON_SECRET is missing or does not match')
  await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 86400000) } } })
  await prisma.authRateLimit.deleteMany({ where: { lastRequest: { lt: BigInt(Date.now() - 86400000) } } })
  const result = await sendDueReminders()
  return jsonOk({ ok: true, ...result })
}

async function handleGET(req: Request) {
  return run(req)
}

async function handlePOST(req: Request) {
  return run(req)
}

export const GET = apiHandler(handleGET)
export const POST = apiHandler(handlePOST)
