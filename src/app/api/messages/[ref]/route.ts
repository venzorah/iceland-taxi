import { apiHandler, jsonError, jsonOk } from '@/lib/api'
import { ownsBooking } from '@/lib/customer/ownership'
import { canUseAdminModule } from '@/lib/auth/permissions'
import { getCurrentUser } from '@/lib/auth/session'
import { getThreadMessages, markThreadRead } from '@/lib/messaging/service'

type Ctx = { params: Promise<{ ref: string }> }

function requestedAs(req: Request) {
  const as = new URL(req.url).searchParams.get('as')
  return as === 'staff' || as === 'customer' ? as : null
}

async function handleGET(req: Request, ctx: Ctx) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { ref } = await ctx.params
  const thread = await getThreadMessages(ref)
  if (!thread) return jsonError(404, 'NOT_FOUND', 'Booking not found')

  const user = await getCurrentUser()
  const staff = user && canUseAdminModule(user.role, 'bookings') && user.staffProfile?.active !== false ? user : null
  const as = requestedAs(req)
  const reader = as || (staff ? 'staff' : 'customer')

  if (reader === 'staff') {
    if (!staff) return jsonError(401, 'UNAUTHORIZED', 'Staff session required')
  } else if (!ownsBooking(user, thread.booking)) {
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

async function handlePATCH(req: Request, ctx: Ctx) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { ref } = await ctx.params
  const user = await getCurrentUser()
  const staff = user && canUseAdminModule(user.role, 'bookings') && user.staffProfile?.active !== false ? user : null
  const guestEmail = user?.role === 'CUSTOMER' ? user.email : null
  const as = requestedAs(req)
  const reader = as || (staff ? 'staff' : guestEmail ? 'customer' : null)
  if (!reader) return jsonError(401, 'UNAUTHORIZED', 'Session required')
  if (reader === 'staff' && !staff) return jsonError(401, 'UNAUTHORIZED', 'Staff session required')
  if (reader === 'customer') {
    const thread = await getThreadMessages(ref)
    if (!thread) return jsonError(404, 'NOT_FOUND', 'Booking not found')
    if (!ownsBooking(user, thread.booking)) {
      return jsonError(403, 'FORBIDDEN', 'Not allowed to view this thread')
    }
  }
  await markThreadRead(ref, reader)
  return jsonOk({ ok: true, readState: 'read' })
}

export const GET = apiHandler(handleGET)
export const PATCH = apiHandler(handlePATCH)
