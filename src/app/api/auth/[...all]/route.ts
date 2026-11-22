import { getAuth } from '@/lib/auth/server'
import { apiHandler, jsonError } from '@/lib/api'
import { mailConfigError } from '@/lib/email/mailer'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const emailPaths = new Set(['/sign-up/email','/request-password-reset','/send-verification-email','/change-email','/email-otp/send-verification-otp','/email-otp/request-password-reset'])

async function handle(req: Request) {
  const path = new URL(req.url).pathname.slice('/api/auth'.length)
  // Email changes must pass the application's current-password check first.
  if (path === '/change-email') return jsonError(403,'REAUTHENTICATION_REQUIRED','Use account security to change your email.')
  if (req.method === 'POST' && emailPaths.has(path) && mailConfigError()) return jsonError(503,'EMAIL_UNAVAILABLE','Account email delivery is not available yet. Please try again later.')
  try {
    const response = await getAuth().handler(req)
    if (response.status >= 500) return jsonError(503,'AUTH_UNAVAILABLE','Sign-in is temporarily unavailable. Please try again shortly.')
    return response
  } catch {
    return jsonError(503,'AUTH_UNAVAILABLE','Sign-in is temporarily unavailable. Please try again shortly.')
  }
}
export const GET = apiHandler(handle)
export const POST = apiHandler(handle)
