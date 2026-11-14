import {z} from 'zod'
import {apiHandler,jsonError,jsonOk,prisma} from '@/lib/api'
import {rejectDriverOnly} from '@/lib/auth/admin-access'
type Ctx={params:Promise<{id:string}>}
export const PATCH=apiHandler(async(req:Request,ctx:Ctx)=>{
 const blocked=await rejectDriverOnly('enquiries');if(blocked)return blocked
 const parsed=z.object({status:z.enum(['NEW','READ','CLOSED'])}).strict().safeParse(await req.json().catch(()=>null))
 if(!parsed.success)return jsonError(400,'VALIDATION_ERROR','Choose a valid message status.')
 const {id}=await ctx.params
 const changed=await prisma.contactMessage.updateMany({where:{id},data:{status:parsed.data.status}})
 if(!changed.count)return jsonError(404,'NOT_FOUND','Message not found.')
 return jsonOk({ok:true,status:parsed.data.status})
})
