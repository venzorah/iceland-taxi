import {z} from 'zod'
import {apiHandler,jsonError,jsonOk,prisma} from '@/lib/api'
import {getCurrentUser} from '@/lib/auth/session'
import {canUseAdminModule} from '@/lib/auth/permissions'
import {vapidConfig} from '@/lib/push/vapid'
import {safePushEndpoint,validPushKeys} from '@/lib/push/endpoint'
export const POST=apiHandler(async(req:Request)=>{
 const user=await getCurrentUser();if(!user)return jsonError(401,'UNAUTHORIZED','Sign in first.')
 if(!vapidConfig().enabled)return jsonError(503,'PUSH_NOT_CONFIGURED','Phone notifications are not available yet. Open-tab alerts still work.')
 const parsed=z.object({endpoint:z.string().max(4096).refine(safePushEndpoint),keys:z.object({p256dh:z.string().max(128),auth:z.string().max(64)})}).strict().safeParse(await req.json().catch(()=>null))
 if(!parsed.success||!validPushKeys(parsed.data.keys.p256dh,parsed.data.keys.auth))return jsonError(400,'VALIDATION_ERROR','Invalid browser push subscription.')
 const staff=user.staffProfile?.active!==false&&canUseAdminModule(user.role,'bookings')
 const driver=user.role==='DRIVER'?await prisma.driver.findFirst({where:{userId:user.id,active:true},select:{id:true}}):null
 const audience=staff?'staff':user.role==='CUSTOMER'?'customer':driver?'driver':null
 if(!audience)return jsonError(403,'FORBIDDEN','Notifications are not available for this account.')
 const identity={endpoint:parsed.data.endpoint,audience}
 const values={...parsed.data.keys,userId:user.id,guestEmail:audience==='customer'?user.email:null,driverId:driver?.id||null}
 const current=await prisma.pushSubscription.findUnique({where:{endpoint_audience:identity}})
 if(current){
  const legacyOwned=!current.userId&&((audience==='customer'&&current.guestEmail===user.email)||(audience==='driver'&&current.driverId===driver?.id))
  if(current.userId!==user.id&&!legacyOwned)return jsonError(409,'SUBSCRIPTION_IN_USE','Reset phone notifications in this browser before enabling them for this account.')
  const updated=await prisma.pushSubscription.updateMany({where:{id:current.id,userId:current.userId,...(legacyOwned?{guestEmail:current.guestEmail,driverId:current.driverId}:{})},data:values})
  if(!updated.count)return jsonError(409,'SUBSCRIPTION_CHANGED','The subscription changed. Please retry.')
 }else{
  try{await prisma.pushSubscription.create({data:{...identity,...values}})}catch(error){if((error as {code?:string}).code==='P2002')return jsonError(409,'SUBSCRIPTION_CHANGED','The subscription changed. Please retry.');throw error}
 }
 return jsonOk({ok:true,audiences:[audience]})
})
export const DELETE=apiHandler(async(req:Request)=>{
 const user=await getCurrentUser();if(!user)return jsonError(401,'UNAUTHORIZED','Sign in first.')
 const parsed=z.object({endpoint:z.string().url().max(4096)}).strict().safeParse(await req.json().catch(()=>null))
 if(!parsed.success)return jsonError(400,'VALIDATION_ERROR','A subscription endpoint is required.')
 const driver=user.role==='DRIVER'?await prisma.driver.findFirst({where:{userId:user.id,active:true},select:{id:true}}):null
 // Legacy customer/driver rows have enough verified ownership to revoke; legacy staff rows do not.
 await prisma.pushSubscription.deleteMany({where:{endpoint:parsed.data.endpoint,OR:[{userId:user.id},...(user.role==='CUSTOMER'?[{userId:null,audience:'customer',guestEmail:user.email}]:[]),...(driver?[{userId:null,audience:'driver',driverId:driver.id}]:[])]}})
 return jsonOk({ok:true})
})
