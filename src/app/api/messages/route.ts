import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/api'
import { getDemoGuestEmail, getDemoStaff } from '@/lib/auth/demo'
import { listStaffInbox, listThreads, postMessage } from '@/lib/messaging/service'

export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const url = new URL(req.url)
  const as = url.searchParams.get('as') || 'auto'
  const staff = await getDemoStaff()
  const guestEmail = await getDemoGuestEmail()

  if (as === 'staff' || (as === 'auto' && staff)) {
    if (!staff) return jsonError(401, 'UNAUTHORIZED', 'Staff demo session required')
    const threads = await listStaffInbox()
    return jsonOk({ ok: true, role: 'staff', inbox: 'all_customer_conversations', threads })
  }

  if (!guestEmail) {
    return jsonOk({
      ok: true,
      role: 'customer',
      threads: [],
      note: 'Identify with POST /api/auth/demo { role: "guest", email } matching a booking guestEmail',
    })
  }
  const threads = await listThreads({ role: 'customer', guestEmail })
  return jsonOk({ ok: true, role: 'customer', guestEmail, threads })
}

const postSchema = z.object({
  bookingRef: z.string().min(3),
  body: z.string().min(1).max(4000),
  as: z.enum(['staff', 'customer']).optional(),
  guestEmail: z.string().email().optional(),
  guestName: z.string().optional(),
})

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const body = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid message', { issues: parsed.error.flatten() })

  const staff = await getDemoStaff()
  const cookieGuest = await getDemoGuestEmail()
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

  const email = (parsed.data.guestEmail || cookieGuest || '').toLowerCase()
  if (!email) return jsonError(401, 'UNAUTHORIZED', 'Guest email required')
  const result = await postMessage({
    bookingRef: parsed.data.bookingRef,
    body: parsed.data.body,
    actor: { kind: 'customer', email, name: parsed.data.guestName },
  })
  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : 403
    return jsonError(status, result.code, result.message)
  }
  return jsonOk({ ok: true, message: result.message, whatsapp: result.whatsapp }, { status: 201 })
}
