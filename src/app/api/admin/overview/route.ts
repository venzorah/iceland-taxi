import { apiHandler, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { toOpsBooking } from '@/lib/booking/service'
import { listStaffInbox } from '@/lib/messaging/service'
export const GET = apiHandler(async () => {
  const blocked = await rejectDriverOnly('bookings')
  if (blocked) return blocked
  // Iceland is UTC year round; use explicit UTC bounds, independent of server timezone.
  const today = new Date().toISOString().slice(0,10)
  const from = new Date(`${today}T00:00:00Z`), to = new Date(from.getTime()+86400000)
  const [bookings, total, awaiting, needDriver, totals, drivers, threads] = await Promise.all([
    prisma.booking.findMany({ where: { pickupAt: { gte: from, lt: to }, status: { notIn: ['CANCELLED','REFUND_REQUESTED','REFUNDED'] } }, include: { driver: true }, orderBy: { pickupAt:'asc' } }),
    prisma.booking.count(),
    prisma.booking.count({ where:{ status:'AWAITING_PAYMENT' } }),
    prisma.booking.count({ where:{ driverId:null, status:'CONFIRMED' } }),
    prisma.booking.groupBy({ by:['currency'], _sum:{amountSnapshot:true}, where:{status:{notIn:['CANCELLED','REFUNDED']}} }),
    prisma.driver.findMany({ select:{ id:true,displayName:true,status:true,active:true },orderBy:{displayName:'asc'} }),
    listStaffInbox(),
  ])
  return jsonOk({ ok:true, today, bookings:bookings.map(toOpsBooking), total, awaiting, needDriver, totals:totals.map(t=>({currency:t.currency,amount:t._sum.amountSnapshot||0})), drivers, threads:threads.slice(0,5) },{headers:{'Cache-Control':'private, no-store'}})
})
