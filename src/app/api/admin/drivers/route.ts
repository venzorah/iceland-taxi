import { z } from 'zod'

import { apiHandler, jsonError, jsonOk } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { createDriverAccount } from '@/lib/auth/driver-accounts'
import { mailConfigError } from '@/lib/email/mailer'

const createSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().nullable().optional(),
  licenceNotes: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  status: z.string().optional(),
  active: z.boolean().optional(),
}).strict()

async function handlePOST(req: Request) {
  const blocked = await rejectDriverOnly('drivers')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter the driver name and email.')
  if (mailConfigError()) return jsonError(503, 'EMAIL_UNAVAILABLE', 'Configure email delivery before creating driver logins.')
  try {
    const result = await createDriverAccount(parsed.data)
    return jsonOk({ ok: true, ...result, message: result.delivery.sent ? 'Driver created. Login details were emailed to the driver.' : 'Driver created, but email delivery could not be confirmed. Use Email login details to send a new password.' }, { status: 201 })
  } catch (error) {
    if (['P2002', 'P2034'].includes((error as { code?: string }).code || '')) return jsonError(409, 'DRIVER_CHANGED', 'This account changed or already exists. Reload Drivers before retrying.')
    throw error
  }
}

export const POST = apiHandler(handlePOST)
