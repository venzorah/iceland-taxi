import { jsonError, jsonOk } from '@/lib/api'
import { getDemoGuestEmail, getDemoStaff } from '@/lib/auth/demo'
import { getThreadMessages, markThreadRead } from '@/lib/messaging/service'

type Ctx = { params: Promise<{ ref: string }> }

function requestedAs(req: Request) {
  const as = new URL(req.url).searchParams.get('as')
  return as === 'staff' || as === 'customer' ? as : null
}

export async function GET(req: Request, ctx: Ctx) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { ref } = await ctx.params
  const thread = await getThreadMessages(ref)
  if (!thread) return jsonError(404, 'NOT_FOUND', 'Booking not found')

  const staff = await getDemoStaff()
  const guestEmail = await getDemoGuestEmail()
  const as = requestedAs(req)
  const reader = as || (staff ? 'staff' : 'customer')

  if (reader === 'staff') {
    if (!staff) return jsonError(401, 'UNAUTHORIZED', 'Staff session required')
  } else if (!guestEmail || thread.booking.guestEmail?.toLowerCase() !== guestEmail.toLowerCase()) {
    return jsonError(403, 'FORBIDDEN', 'Not allowed to view this thread')
  }

  await markThreadRead(ref, reader)
  return jsonOk({
    ok: true,
    ref,
    readState: 'read',
    booking: {
      ref: thread.booking.ref,
      customer: thread.booking.guestName,
      email: thread.booking.guestEmail,
      service: thread.booking.serviceLabel,
      route: thread.booking.routeLabel,
      status: thread.booking.status,
    },
    messages: thread.messages,
  })
}

export async function PATCH(req: Request, ctx: Ctx) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { ref } = await ctx.params
  const staff = await getDemoStaff()
  const guestEmail = await getDemoGuestEmail()
  const as = requestedAs(req)
  const reader = as || (staff ? 'staff' : guestEmail ? 'customer' : null)
  if (!reader) return jsonError(401, 'UNAUTHORIZED', 'Session required')
  if (reader === 'staff' && !staff) return jsonError(401, 'UNAUTHORIZED', 'Staff session required')
  if (reader === 'customer') {
    const thread = await getThreadMessages(ref)
    if (!thread) return jsonError(404, 'NOT_FOUND', 'Booking not found')
    if (!guestEmail || thread.booking.guestEmail?.toLowerCase() !== guestEmail.toLowerCase()) {
      return jsonError(403, 'FORBIDDEN', 'Not allowed to view this thread')
    }
  }
  await markThreadRead(ref, reader)
  return jsonOk({ ok: true, readState: 'read' })
}
