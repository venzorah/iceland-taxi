import { jsonError, jsonOk } from '@/lib/api'
import { getDemoGuestEmail, getDemoStaff } from '@/lib/auth/demo'
import { getThreadMessages, markThreadRead } from '@/lib/messaging/service'

type Ctx = { params: Promise<{ ref: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { ref } = await ctx.params
  const thread = await getThreadMessages(ref)
  if (!thread) return jsonError(404, 'NOT_FOUND', 'Booking not found')

  const staff = await getDemoStaff()
  const guestEmail = await getDemoGuestEmail()
  if (!staff) {
    if (!guestEmail || thread.booking.guestEmail?.toLowerCase() !== guestEmail.toLowerCase()) {
      return jsonError(403, 'FORBIDDEN', 'Not allowed to view this thread')
    }
  }

  await markThreadRead(ref, staff ? 'staff' : 'customer')
  return jsonOk({
    ok: true,
    ref,
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

export async function PATCH(_req: Request, ctx: Ctx) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { ref } = await ctx.params
  const staff = await getDemoStaff()
  const guestEmail = await getDemoGuestEmail()
  if (!staff && !guestEmail) return jsonError(401, 'UNAUTHORIZED', 'Session required')
  await markThreadRead(ref, staff ? 'staff' : 'customer')
  return jsonOk({ ok: true })
}
