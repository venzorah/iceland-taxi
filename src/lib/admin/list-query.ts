import { z } from 'zod'
import { PaymentStatus } from '@prisma/client'
import type { Prisma } from '@prisma/client'
export const listQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  filter: z.enum(['All','Needs driver','Awaiting payment','Quotes','Completed']).default('All'),
  status: z.union([z.nativeEnum(PaymentStatus), z.literal('')]).default(''),
})
export function parseListQuery(params: URLSearchParams) { return listQuerySchema.safeParse({ q: params.get('q') || '', filter: params.get('filter') || 'All', status: params.get('status') || '' }) }
export function bookingListWhere(query: z.infer<typeof listQuerySchema>): Prisma.BookingWhereInput {
  return { ...(query.q ? { OR: [
    {ref:{contains:query.q,mode:'insensitive'}},{guestName:{contains:query.q,mode:'insensitive'}},{guestEmail:{contains:query.q,mode:'insensitive'}},
    {routeLabel:{contains:query.q,mode:'insensitive'}},{serviceLabel:{contains:query.q,mode:'insensitive'}},{driver:{is:{displayName:{contains:query.q,mode:'insensitive'}}}},
  ] } : {}), ...(query.filter === 'Needs driver' ? {status:'CONFIRMED',driverId:null} : query.filter === 'Awaiting payment' ? {status:'AWAITING_PAYMENT'} : query.filter === 'Quotes' ? {status:'PENDING'} : query.filter === 'Completed' ? {status:'COMPLETED'} : {}) }
}
export function paymentListWhere(query: z.infer<typeof listQuerySchema>): Prisma.PaymentWhereInput {
  return { ...(query.status ? {status:query.status} : {}), ...(query.q ? {OR:[{id:{contains:query.q,mode:'insensitive'}},{provider:{contains:query.q,mode:'insensitive'}},{booking:{is:{OR:[{ref:{contains:query.q,mode:'insensitive'}},{guestName:{contains:query.q,mode:'insensitive'}}]}}}]} : {}) }
}
