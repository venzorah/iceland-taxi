import {apiHandler,jsonOk,prisma} from '@/lib/api'
import {SITE_DEFAULTS} from '@/lib/content/blocks'
export const GET=apiHandler(async()=>{
 const rows=await prisma.siteBlock.findMany()
 const blocks=Object.fromEntries(rows.filter(r=>Object.prototype.hasOwnProperty.call(SITE_DEFAULTS,r.key)&&r.value.trim()).map(r=>[r.key,r.value]))
 return jsonOk({ok:true,blocks},{headers:{'Cache-Control':'no-store'}})
})
