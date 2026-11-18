import { supportedBcrypt } from './password'
export type SourceIdentity = {
 id:string; email:string|null; email_confirmed_at:Date|null; encrypted_password:string|null
 created_at:Date; updated_at:Date|null; banned_until:Date|null; deleted_at:Date|null
 is_anonymous:boolean; providers:string[]
}
export type BusinessIdentity = {id:string;authId:string|null;email:string;name:string|null;role:string;createdAt:Date;updatedAt:Date}
export function planIdentityImport(source:SourceIdentity[],business:BusinessIdentity[],target:BusinessIdentity[]) {
 const fold=(email:string)=>email.trim().toLowerCase()
 const targetById=new Map(target.map(user=>[user.id,user]))
 if(target.length!==business.length)throw new Error('BUSINESS_USER_COUNT_MISMATCH')
 for(const user of business){
  const restored=targetById.get(user.id)
  if(!restored||restored.authId!==user.authId||restored.email!==user.email||restored.role!==user.role||restored.createdAt.getTime()!==user.createdAt.getTime()||restored.updatedAt.getTime()!==user.updatedAt.getTime())throw new Error('BUSINESS_USER_RESTORE_MISMATCH')
 }
 if(new Set(business.map(user=>fold(user.email))).size!==business.length)throw new Error('DUPLICATE_BUSINESS_EMAIL')
 const ids=new Set<string>(),emails=new Set<string>()
 for(const identity of source){
  if(!identity.email||identity.is_anonymous||identity.providers.some(provider=>provider!=='email')||!identity.providers.includes('email'))throw new Error('UNSUPPORTED_IDENTITY_REQUIRES_REVIEW')
  const email=fold(identity.email)
  if(ids.has(identity.id)||emails.has(email))throw new Error('DUPLICATE_SOURCE_IDENTITY')
  ids.add(identity.id);emails.add(email)
 }
 if(business.some(user=>user.authId&&!ids.has(user.authId)))throw new Error('MISSING_SOURCE_IDENTITY')
 const claimed=new Set<string>()
 return source.map(identity=>{
  const email=fold(identity.email!)
  const linked=business.find(user=>user.authId===identity.id)
  const byEmail=business.find(user=>fold(user.email)===email)
  if(linked&&byEmail&&linked.id!==byEmail.id)throw new Error('EMAIL_LINK_COLLISION')
  if(byEmail?.authId&&byEmail.authId!==identity.id)throw new Error('IDENTITY_LINK_COLLISION')
  const app=linked||(!byEmail?.authId&&identity.email_confirmed_at?byEmail:undefined)
  if(app&&claimed.has(app.id))throw new Error('DUPLICATE_APPLICATION_LINK')
  if(app)claimed.add(app.id)
  const password=identity.encrypted_password&&supportedBcrypt(identity.encrypted_password)?identity.encrypted_password:null
  return {
   id:identity.id,appUserId:app?.id||null,name:app?.name||email,email,
   emailVerified:Boolean(identity.email_confirmed_at),
   disabled:Boolean(identity.deleted_at||(identity.banned_until&&identity.banned_until.getTime()>Date.now())),
   createdAt:identity.created_at,updatedAt:identity.updated_at||identity.created_at,
   password,resetRequired:!password,
  }
 })
}
