import {z} from 'zod'
import {apiHandler,jsonError,jsonOk,prisma} from '@/lib/api'
import {getCurrentUser} from '@/lib/auth/session'
import {getAuth} from '@/lib/auth/server'
import {verifyAccountPassword} from '@/lib/auth/password'
import {rateLimit} from '@/lib/security/rate-limit'
import {mailConfigError} from '@/lib/email/mailer'
const schema=z.object({currentPassword:z.string().min(1).max(128),password:z.string().min(12).max(128).optional(),email:z.string().trim().toLowerCase().email().max(254).optional()}).strict().refine(value=>Boolean(value.password)!==Boolean(value.email))
export const POST=apiHandler(async(req:Request)=>{
 const user=await getCurrentUser()
 if(!user)return jsonError(401,'UNAUTHORIZED','Sign in to update account security.')
 await rateLimit('account-security',user.id,5,600000)
 const parsed=schema.safeParse(await req.json().catch(()=>null))
 if(!parsed.success)return jsonError(400,'VALIDATION_ERROR','Enter your current password and either a new password or email.')
 const identity=await prisma.authIdentity.findUnique({where:{appUserId:user.id}})
 const credential=identity&&await prisma.authAccount.findFirst({where:{userId:identity.id,providerId:'credential'}})
 if(!credential?.password||!await verifyAccountPassword({hash:credential.password,password:parsed.data.currentPassword}))return jsonError(400,'INVALID_PASSWORD','Your current password could not be verified.')
 const auth=getAuth()
 if(parsed.data.email){
  if(mailConfigError())return jsonError(503,'EMAIL_UNAVAILABLE','Account email delivery is not available yet.')
  const collision=await prisma.user.findFirst({where:{id:{not:user.id},email:{equals:parsed.data.email,mode:'insensitive'}},select:{id:true}})
  if(collision)return jsonError(400,'EMAIL_UNAVAILABLE','This email address is not available.')
  try{
   await auth.api.changeEmail({headers:req.headers,body:{newEmail:parsed.data.email,callbackURL:'/auth/confirm'}})
   return jsonOk({ok:true})
  }catch{return jsonError(400,'EMAIL_CHANGE_FAILED','Could not start the email change. Check the address or sign in again.')}
 }
 try{return await auth.api.changePassword({headers:req.headers,body:{currentPassword:parsed.data.currentPassword,newPassword:parsed.data.password!,revokeOtherSessions:true},asResponse:true})}
 catch{return jsonError(400,'PASSWORD_CHANGE_FAILED','Could not update your password. Please sign in again and retry.')}
})
