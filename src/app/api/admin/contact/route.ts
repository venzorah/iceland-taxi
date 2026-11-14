import {apiHandler,jsonOk,prisma} from '@/lib/api'
import {rejectDriverOnly} from '@/lib/auth/admin-access'
export const GET=apiHandler(async()=>{
 const blocked=await rejectDriverOnly('enquiries');if(blocked)return blocked
 const messages=await prisma.contactMessage.findMany({orderBy:{createdAt:'desc'},take:200,select:{id:true,name:true,email:true,bookingRef:true,topic:true,body:true,status:true,createdAt:true}})
 return jsonOk({ok:true,messages})
})
