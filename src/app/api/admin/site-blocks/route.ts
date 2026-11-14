import {z} from 'zod'
import {apiHandler,jsonError,jsonOk,prisma} from '@/lib/api'
import {rejectDriverOnly} from '@/lib/auth/admin-access'
import {SITE_BLOCKS,SITE_DEFAULTS} from '@/lib/content/blocks'
export const GET=apiHandler(async()=>{
 const blocked=await rejectDriverOnly('editorial');if(blocked)return blocked
 const saved=await prisma.siteBlock.findMany(),overrides=Object.fromEntries(saved.map(r=>[r.key,r.value]))
 return jsonOk({ok:true,blocks:SITE_BLOCKS.map(b=>({...b,value:overrides[b.key]??b.value,custom:Object.prototype.hasOwnProperty.call(overrides,b.key)}))},{headers:{'Cache-Control':'private, no-store'}})
})
export const PUT=apiHandler(async(req:Request)=>{
 const blocked=await rejectDriverOnly('editorial');if(blocked)return blocked
 const parsed=z.object({key:z.string().min(1),value:z.string().max(20000)}).strict().safeParse(await req.json().catch(()=>null))
 if(!parsed.success)return jsonError(400,'VALIDATION_ERROR','Choose a field and a valid value.')
 const known=SITE_BLOCKS.find(b=>b.key===parsed.data.key)
 if(!known)return jsonError(400,'VALIDATION_ERROR','Unknown website field.')
 const value=parsed.data.value.trim()
 if(known.kind==='image'&&value){
  const builtIn=value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!value.includes('..')
  let valid=builtIn
  try{const url=new URL(value);valid=url.protocol==='https:'&&!url.username&&!url.password}catch{/* Relative built-in asset. */}
  if(!valid)return jsonError(400,'VALIDATION_ERROR','Choose a library image or an HTTPS image URL.')
 }
 if(!value||value===SITE_DEFAULTS[known.key]){await prisma.siteBlock.deleteMany({where:{key:known.key}});return jsonOk({ok:true,value:SITE_DEFAULTS[known.key],custom:false})}
 await prisma.siteBlock.upsert({where:{key:known.key},create:{key:known.key,value},update:{value}})
 return jsonOk({ok:true,value,custom:true})
})
