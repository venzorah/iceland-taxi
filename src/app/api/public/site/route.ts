import {companyWhatsAppNumber} from '@/lib/whatsapp'
import {apiHandler,jsonOk,prisma} from '@/lib/api'
import {SITE_DEFAULTS} from '@/lib/content/blocks'
export const GET=apiHandler(async()=>{
 const [rows,company]=await Promise.all([prisma.siteBlock.findMany(),prisma.companySettings.findUnique({where:{id:'singleton'},select:{whatsappE164:true}})])
 const blocks=Object.fromEntries(rows.filter(r=>Object.prototype.hasOwnProperty.call(SITE_DEFAULTS,r.key)&&r.value.trim()).map(r=>[r.key,r.value]))
 return jsonOk({ok:true,blocks,whatsappE164:companyWhatsAppNumber(company?.whatsappE164)},{headers:{'Cache-Control':'no-store'}})
})
