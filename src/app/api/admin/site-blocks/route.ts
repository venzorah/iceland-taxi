import type { PrismaClient } from '@prisma/client'
import { safeHeroHref } from '@/lib/content/hero'
import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { SITE_BLOCKS, SITE_DEFAULTS } from '@/lib/content/blocks'

export const GET = apiHandler(async () => {
 const blocked=await rejectDriverOnly('editorial');if(blocked)return blocked
 const saved=await prisma.siteBlock.findMany(),overrides=Object.fromEntries(saved.map(r=>[r.key,r.value]))
 return jsonOk({ok:true,blocks:SITE_BLOCKS.map(b=>({...b,value:overrides[b.key]??b.value,custom:Object.prototype.hasOwnProperty.call(overrides,b.key)}))},{headers:{'Cache-Control':'private, no-store'}})
})
const changeSchema=z.object({key:z.string().min(1),value:z.string().max(20000)}).strict()
const schema=z.union([changeSchema,z.object({updates:z.array(changeSchema).min(1).max(200)}).strict()])

export const PUT = apiHandler(async (req: Request) => {
 const blocked=await rejectDriverOnly('editorial');if(blocked)return blocked
 const parsed=schema.safeParse(await req.json().catch(()=>null))
 if(!parsed.success)return jsonError(400,'VALIDATION_ERROR','Choose a field and a valid value.')
 const batch='updates' in parsed.data
 const entries='updates' in parsed.data?parsed.data.updates:[parsed.data]
 if(new Set(entries.map(entry=>entry.key)).size!==entries.length)return jsonError(400,'VALIDATION_ERROR','A field can only be saved once per request.')
 const changes:{key:string;value:string}[]=[]
 // Validate the whole page before making any write.
 for(const entry of entries){
  const known=SITE_BLOCKS.find(b=>b.key===entry.key)
  if(!known)return jsonError(400,'VALIDATION_ERROR','Unknown website field.')
  const value=entry.value.trim()
  if(known.kind==='link'&&value&&!safeHeroHref(value))return jsonError(400,'VALIDATION_ERROR',`${known.label}: use a site path beginning with / or a secure HTTPS link.`)
  if(known.kind==='image'&&value){
   const builtIn=value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!value.includes('..')
   let valid=builtIn
   try{const url=new URL(value);valid=url.protocol==='https:'&&!url.username&&!url.password}catch{/* Relative built-in asset. */}
   if(!valid)return jsonError(400,'VALIDATION_ERROR','Choose a library image or an HTTPS image URL.')
  }
  changes.push({key:known.key,value})
 }
 const write=async(db:Pick<PrismaClient,'siteBlock'>,change:{key:string;value:string})=>{
  if(!change.value||change.value===SITE_DEFAULTS[change.key]){
   await db.siteBlock.deleteMany({where:{key:change.key}})
   return {key:change.key,value:SITE_DEFAULTS[change.key],custom:false}
  }
  await db.siteBlock.upsert({where:{key:change.key},create:change,update:{value:change.value}})
  return {...change,custom:true}
 }
 if(!batch)return jsonOk({ok:true,...await write(prisma,changes[0])})
 const updates=await prisma.$transaction(async tx=>{
  const results=[]
  for(const change of changes)results.push(await write(tx,change))
  return results
 })
 return jsonOk({ok:true,updates})
})
