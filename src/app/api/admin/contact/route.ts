import { z } from 'zod'
import {apiHandler,jsonOk,jsonError,prisma} from '@/lib/api'
import {rejectDriverOnly} from '@/lib/auth/admin-access'
export const GET=apiHandler(async(req:Request)=>{
 const blocked=await rejectDriverOnly('enquiries');if(blocked)return blocked
 const params=new URL(req.url).searchParams
 const parsed=z.object({q:z.string().trim().max(200),filter:z.enum(['','NEW','READ','CLOSED'])}).safeParse({q:params.get('q')||'',filter:params.get('filter')||''})
 if(!parsed.success)return jsonError(400,'VALIDATION_ERROR','Invalid message search.')
 const {q,filter}=parsed.data
 const messages=await prisma.contactMessage.findMany({where:{...(filter?{status:filter}:{}),...(q?{OR:['name','email','bookingRef','topic','body'].map(field=>({[field]:{contains:q,mode:'insensitive' as const}}))}:{})},orderBy:{createdAt:'desc'},take:200,select:{id:true,name:true,email:true,bookingRef:true,topic:true,body:true,status:true,createdAt:true}})
 return jsonOk({ok:true,messages})
})
