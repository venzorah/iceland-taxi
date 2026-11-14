import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
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
  const user = await getCurrentUser()
  const staff = user && canUseAdminModule(user.role, 'bookings') && user.staffProfile?.active !== false ? user : null
  const as = requestedAs(req)
  const reader = as || (staff ? 'staff' : 'customer')
  if(!user)return jsonError(401,'UNAUTHORIZED','Sign in to view messages.')
  const booking=await prisma.booking.findUnique({where:{ref},select:{id:true,customerId:true,guestEmail:true}})
  if(!booking)return jsonError(404,'NOT_FOUND','Conversation not found.')

  if (reader === 'staff') {
    if (!staff) return jsonError(401, 'UNAUTHORIZED', 'Staff session required')
  } else if (!ownsBooking(user, booking)) {
    return jsonError(404, 'NOT_FOUND', 'Conversation not found.')
  }

  const thread=await getThreadMessages(ref)
  if(!thread)return jsonError(404,'NOT_FOUND','Conversation not found.')
  return jsonOk({
    ok: true,
    ref,
    readState: 'loaded',
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
    const booking = await prisma.booking.findUnique({where:{ref},select:{id:true,customerId:true,guestEmail:true}})
    if (!booking || !ownsBooking(user, booking)) return jsonError(404, 'NOT_FOUND', 'Conversation not found.')
  }
  const parsed=z.object({messageIds:z.array(z.string().min(1).max(100)).max(1000)}).strict().safeParse(await req.json().catch(()=>null))
  if(!parsed.success)return jsonError(400,'VALIDATION_ERROR','Choose the displayed messages to mark read.')
  await markThreadRead(ref, reader, parsed.data.messageIds)
  return jsonOk({ ok: true, readState: 'read' })
}

export const GET = apiHandler(handleGET)
export const PATCH = apiHandler(handlePATCH)
