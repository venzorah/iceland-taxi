import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { driverConversationAccess } from '@/lib/driver/access'
import { pushMessageAlert } from '@/lib/push/send'
type Ctx = { params: Promise<{ ref: string }> }
export const GET = apiHandler(async (req: Request, ctx: Ctx) => {
  const { ref } = await ctx.params
  const access = await driverConversationAccess(ref)
  if (!access) return jsonError(404, 'NOT_FOUND', 'Assigned conversation not found.')
  const before = new URL(req.url).searchParams.get('before')
  if (before && !/^[a-zA-Z0-9_-]{1,128}$/.test(before)) return jsonError(400, 'VALIDATION_ERROR', 'Invalid page.')
  const page = await prisma.message.findMany({ where: { bookingId: access.booking.id, channel: 'driver_ops' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 101, ...(before ? { cursor: { id: before }, skip: 1 } : {}), include: { author: { select: { name: true } } } })
  const messages = page.slice(0, 100).reverse()
  return jsonOk({ ok: true, nextCursor: page.length > 100 ? page[99].id : null, messages: messages.map(m => ({ id: m.id, body: m.body, authorRole: m.authorRole, authorName: m.author?.name || (m.authorRole === 'driver' ? 'Driver' : 'Operations'), time: m.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik' }) })) }, { headers: { 'Cache-Control': 'private, no-store' } })
})
export const POST = apiHandler(async (req: Request, ctx: Ctx) => {
  const { ref } = await ctx.params
  const access = await driverConversationAccess(ref)
  if (!access) return jsonError(404, 'NOT_FOUND', 'Assigned conversation not found.')
  const parsed = z.object({ body: z.string().trim().min(1).max(4000) }).strict().safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter a message of up to 4000 characters.')
  const message = await prisma.$transaction(async tx => {
    // Assignment can change while the driver writes a message.
    const booking = await tx.booking.findFirst({ where: { id: access.booking.id, driverId: access.booking.driverId } })
    if (!booking) return null
    if (access.role === 'driver' && !await tx.driver.findFirst({ where: { id: access.booking.driverId!, userId: access.user.id, active: true } })) return null
    const saved = await tx.message.create({ data: { bookingId: booking.id, authorId: access.user.id, authorRole: access.role, channel: 'driver_ops', unread: true, body: parsed.data.body } })
    await tx.booking.update({ where: { id: booking.id }, data: { updatedAt: new Date() } })
    return saved
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 })
  if (!message) return jsonError(409, 'ASSIGNMENT_CHANGED', 'The assignment changed. Refresh your journeys.')
  void pushMessageAlert({ bookingRef: ref, messageId: message.id, authorRole: access.role, guestEmail: null, driverId: access.booking.driverId, channel: 'driver_ops' }).catch(() => {})
  return jsonOk({ ok: true, message: { id: message.id } }, { status: 201 })
})

export const PATCH=apiHandler(async(req:Request,ctx:Ctx)=>{
 const {ref}=await ctx.params,access=await driverConversationAccess(ref)
 if(!access)return jsonError(404,'NOT_FOUND','Assigned conversation not found.')
 const parsed=z.object({messageIds:z.array(z.string().min(1).max(100)).max(1000)}).strict().safeParse(await req.json().catch(()=>null))
 if(!parsed.success)return jsonError(400,'VALIDATION_ERROR','Choose the displayed messages to mark read.')
 await prisma.message.updateMany({where:{bookingId:access.booking.id,channel:'driver_ops',id:{in:parsed.data.messageIds},unread:true,authorRole:access.role==='driver'?'staff':'driver'},data:{unread:false}})
 return jsonOk({ok:true})
})
