import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { deliverBounded } from './bounded-delivery'
test('actual booking notices await delivery state, deduplicate recipients and persist SMTP failure',async()=>{
 const states=new Map<string,Record<string,unknown>>();let sent=0,companyReads=0
 const booking={id:'fixture-booking',ref:'FIXTURE',guestEmail:'customer@example.test',customer:null,driver:null,vehicle:null,pickupAt:new Date(),routeLabel:'Fixture',passengers:1,amountSnapshot:100,currency:'ISK'}
 const prisma={booking:{findUnique:async()=>booking},companySettings:{findUnique:async()=>{companyReads++;return{displayName:'Fixture',email:'operations@example.test'}}},user:{findMany:async()=>[{email:'operations@example.test'},{email:'other@example.test'}]},emailNotice:{findUnique:async({where}:{where:{dedupeKey:string}})=>states.get(where.dedupeKey),upsert:async({where,create,update}:{where:{dedupeKey:string};create:Record<string,unknown>;update:Record<string,unknown>})=>{states.set(where.dedupeKey,states.has(where.dedupeKey)?update:create)}}}
 const imports:Record<string,unknown>={ './bounded-delivery':{deliverBounded},'@prisma/client':{BookingStatus:{}},'@/lib/admin/content':{STAFF_ROLES:['SUPER_ADMIN']},'@/lib/api':{prisma},'./mailer':{sendMail:async({to}:{to:string})=>{sent++;await new Promise(r=>setTimeout(r,5));return to==='other@example.test'?{ok:false,message:'Fixture delivery failure'}:{ok:true}}},'./schedule':{},'./templates':{styledEmail:()=>({html:'fixture',text:'fixture'})}}
 const source=ts.transpileModule(readFileSync('src/lib/email/notices.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const exports:Record<string,unknown>={};vm.runInNewContext(source,{exports,require:(name:string)=>{if(!(name in imports))throw Error('Unexpected dependency');return imports[name]},Date,Set})
 const notify=exports.notifyBookingCreated as (id:string)=>Promise<void>;await notify(booking.id)
 assert.equal(sent,3);assert.equal(states.size,3);assert.equal(companyReads,2);assert.equal([...states.values()].filter(s=>s.status==='failed').length,1)
 await notify(booking.id);assert.equal(sent,4);assert.equal(states.size,3) // Only the failed notice is retried, never the two already sent.
})
