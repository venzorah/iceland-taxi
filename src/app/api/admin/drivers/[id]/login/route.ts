import { apiHandler, jsonError, jsonOk } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { emailDriverLogin } from '@/lib/auth/driver-accounts'
import { mailConfigError } from '@/lib/email/mailer'
import { rateLimit } from '@/lib/security/rate-limit'

export const POST = apiHandler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const blocked = await rejectDriverOnly('drivers')
  if (blocked) return blocked
  if (mailConfigError()) return jsonError(503, 'EMAIL_UNAVAILABLE', 'Configure email delivery before sending driver logins.')
  const { id } = await ctx.params
  await rateLimit('driver-login-email', id, 3, 15 * 60_000)
  try {
    const result = await emailDriverLogin(id)
    return jsonOk({ ok: true, ...result, message: result.delivery.sent ? 'New login details were emailed to the driver. Previous sessions were signed out.' : 'Login updated, but email delivery could not be confirmed. Check the email address before sending new details again.' })
  } catch (error) {
    if (['P2002', 'P2034'].includes((error as { code?: string }).code || '')) return jsonError(409, 'DRIVER_CHANGED', 'The login changed. Reload Drivers before retrying.')
    throw error
  }
})
