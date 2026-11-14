import { z } from 'zod'
import { apiHandler, jsonError, jsonOk } from '@/lib/api'
import { canUseAdminModule } from '@/lib/auth/permissions'
import { getCurrentUser } from '@/lib/auth/session'
import { listStaffInbox, listThreads, postMessage } from '@/lib/messaging/service'

async function handleGET(req: Request) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const url = new URL(req.url)
  const as = url.searchParams.get('as') || 'auto'
  const user = await getCurrentUser()
  const staff = user && canUseAdminModule(user.role, 'bookings') && user.staffProfile?.active !== false ? user : null
  const guestEmail = user?.role === 'CUSTOMER' ? user.email : null

  if (as === 'staff' || (as === 'auto' && staff)) {
    if (!staff) return jsonError(401, 'UNAUTHORIZED', 'Staff session required')
    const threads = await listStaffInbox()
    return jsonOk({ ok: true, role: 'staff', inbox: 'all_customer_conversations', threads })
  }

  if (!guestEmail) {
    return jsonError(401, 'UNAUTHORIZED', 'Sign in to view your conversations.')
  }
  const threads = await listThreads({ role: 'customer', guestEmail, customerId: user?.id })
  return jsonOk({ ok: true, role: 'customer', guestEmail, threads })
}

const postSchema = z.object({
  bookingRef: z.string().min(3),
  body: z.string().trim().min(1).max(4000),
  as: z.enum(['staff', 'customer']).optional(),
  guestEmail: z.string().email().optional(),
  guestName: z.string().optional(),
})

async function handlePOST(req: Request) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const body = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid message', { issues: parsed.error.flatten() })

  const user = await getCurrentUser()
  const staff = user && canUseAdminModule(user.role, 'bookings') && user.staffProfile?.active !== false ? user : null
  const cookieGuest = user?.role === 'CUSTOMER' ? user.email : null
  const as = parsed.data.as || (staff ? 'staff' : 'customer')

  if (as === 'staff') {
    if (!staff) return jsonError(401, 'UNAUTHORIZED', 'Staff session required')
    const result = await postMessage({
      bookingRef: parsed.data.bookingRef,
      body: parsed.data.body,
      actor: { kind: 'staff', userId: staff.id, name: staff.name },
    })
    if (!result.ok) return jsonError(result.code === 'NOT_FOUND' ? 404 : 403, result.code, result.message)
    return jsonOk({ ok: true, message: result.message }, { status: 201 })
  }

  const email = (cookieGuest || '').toLowerCase()
  if (!email) return jsonError(401, 'UNAUTHORIZED', 'Guest email required')
  const result = await postMessage({
    bookingRef: parsed.data.bookingRef,
    body: parsed.data.body,
    actor: { kind: 'customer', email, userId: user?.id, name: user?.name },
  })
  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : 403
    return jsonError(status, result.code, result.message)
  }
  return jsonOk({ ok: true, message: result.message, whatsapp: result.whatsapp }, { status: 201 })
}

export const GET = apiHandler(handleGET)
export const POST = apiHandler(handlePOST)
