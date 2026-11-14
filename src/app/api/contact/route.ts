import {createHash} from 'node:crypto'
import {apiHandler,jsonError,jsonOk,prisma} from '@/lib/api'
import {rateLimit} from '@/lib/security/rate-limit'
import {contactSchema} from '@/lib/contact/schema'
export const POST=apiHandler(async(req:Request)=>{
 const parsed=contactSchema.safeParse(await req.json().catch(()=>null))
 if(!parsed.success)return jsonError(400,'VALIDATION_ERROR','Enter your name, a valid email and a message between 10 and 4000 characters.')
 const {requestKey,website:_website,...input}=parsed.data
 const requestHash=createHash('sha256').update(JSON.stringify(input)).digest('hex')
 const previous=await prisma.contactMessage.findUnique({where:{requestKey},select:{id:true,requestHash:true}})
 if(previous){if(previous.requestHash!==requestHash)return jsonError(409,'REQUEST_CHANGED','This request was already used for a different message.');return jsonOk({ok:true,id:previous.id,status:'received'})}
 await rateLimit('contact-email',input.email,5,3600000)
 try{
  const saved=await prisma.contactMessage.create({data:{...input,bookingRef:input.bookingRef||null,requestKey,requestHash},select:{id:true}})
  return jsonOk({ok:true,id:saved.id,status:'received'},{status:201})
 }catch(error){if((error as {code?:string}).code==='P2002'){const saved=await prisma.contactMessage.findUnique({where:{requestKey},select:{id:true,requestHash:true}});if(saved?.requestHash===requestHash)return jsonOk({ok:true,id:saved.id,status:'received'});return jsonError(409,'REQUEST_CHANGED','This message changed. Refresh and try again.')}throw error}
})
