import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const patchSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/).nullable().optional(),
  licenceNotes: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  status: z.string().optional(),
  active: z.boolean().optional(),
}).strict()

type Ctx = { params: Promise<{ id: string }> }

async function handlePATCH(req: Request, ctx: Ctx) {
  const blocked = await rejectDriverOnly('drivers')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(error => { if (error.code === 'P2025') return null; throw error }))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid driver.')
  const {phone,...fields}=parsed.data
  const driver=await prisma.$transaction(async tx=>{
    const current=await tx.driver.findUnique({where:{id}})
    if(!current)return null
    const status=fields.active===false?'Suspended':fields.active===true&&current.status==='Suspended'&&!fields.status?'Available':fields.status
    const updated=await tx.driver.update({where:{id},data:{...fields,status}})
    if(phone!==undefined||fields.displayName)await tx.user.update({where:{id:current.userId},data:{phone,name:fields.displayName}})
    return updated
  })
  if(!driver)return jsonError(404,'NOT_FOUND','Driver not found.')
  return jsonOk({ ok: true, driver })
}

export const PATCH = apiHandler(handlePATCH)

export const DELETE=apiHandler(async(_req:Request,ctx:Ctx)=>{
 const blocked=await rejectDriverOnly('drivers');if(blocked)return blocked
 const {id}=await ctx.params
 try{
 const result=await prisma.$transaction(async tx=>{
  if(!await tx.driver.findUnique({where:{id}}))return 'missing'
  if(await tx.booking.count({where:{driverId:id,status:{in:['DRIVER_EN_ROUTE','IN_PROGRESS']}}}))return 'busy'
  await tx.driver.update({where:{id},data:{active:false,status:'Suspended'}})
  return 'archived'
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:20000})
 if(result==='missing')return jsonError(404,'NOT_FOUND','Driver not found.')
 if(result==='busy')return jsonError(409,'JOURNEY_STARTED','Finish the current journey before archiving this driver.')
 return jsonOk({ok:true,archived:true})
 }catch(error){if((error as {code?:string}).code==='P2034')return jsonError(409,'DRIVER_CHANGED','Driver assignments changed. Refresh and try again.');throw error}
})
