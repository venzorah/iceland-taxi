import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { z } from 'zod'
import { HERO_SLIDES, safeHeroHref } from './hero'
import { SITE_BLOCKS, SITE_DEFAULTS } from './blocks'
import { companyWhatsAppNumber, normalizeStoredE164, whatsappHref } from '@/lib/whatsapp'

test('every hero slide exposes editable text, translation, alt, button and safe destination fields without duplicate keys',()=>{
 assert.equal(new Set(SITE_BLOCKS.map(b=>b.key)).size,SITE_BLOCKS.length)
 for(const slide of HERO_SLIDES){
  for(const field of ['title','body','alt','cta','href','titleIs','bodyIs','ctaIs']) assert(SITE_BLOCKS.some(b=>b.key===`${slide.key}.${field}`))
  assert(safeHeroHref(SITE_DEFAULTS[`${slide.key}.href`]))
 }
 for(const value of ['javascript:alert(1)','data:text/html,bad','//evil.example','/\\evil.example','https://user:password@example.com','/bad\nlink','http://example.com']) assert.equal(safeHeroHref(value),false)
 for(const value of ['/private-tours','/search?category=airport','https://example.com/tours']) assert(safeHeroHref(value))
 assert.equal(whatsappHref({e164:companyWhatsAppNumber('+354 555 0100'),text:'Hello & welcome'}),'https://wa.me/3545550100?text=Hello%20%26%20welcome')
 assert.equal(whatsappHref({}),'/contact')
 assert.equal(normalizeStoredE164('+00000000'),null)
})

test('admin hero changes persist only after permission and link validation; blank resets defaults',async()=>{
 const rows=new Map<string,string>();let blocked=false
 const exports:Record<string,(req?:Request)=>Promise<Response>>={}
 const source=ts.transpileModule(readFileSync('src/app/api/admin/site-blocks/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(source,{exports,URL,require:(name:string)=>{
  if(name==='zod')return {z}
  if(name==='@/lib/content/hero')return {safeHeroHref}
  if(name==='@/lib/content/blocks')return {SITE_BLOCKS,SITE_DEFAULTS}
  if(name==='@/lib/auth/admin-access')return {rejectDriverOnly:async()=>blocked?Response.json({ok:false},{status:403}):null}
  if(name==='@/lib/api')return {apiHandler:(fn:unknown)=>fn,jsonOk:Response.json,jsonError:(status:number,code:string,message:string)=>Response.json({code,message},{status}),prisma:{siteBlock:{findMany:async()=>[...rows].map(([key,value])=>({key,value})),upsert:async({create}:{create:{key:string;value:string}})=>rows.set(create.key,create.value),deleteMany:async({where}:{where:{key:string}})=>rows.delete(where.key)}}}
  throw Error('Unexpected fixture import')
 }})
 const save=(key:string,value:string)=>exports.PUT(new Request('https://fixture.invalid/api/admin/site-blocks',{method:'PUT',body:JSON.stringify({key,value})}))
 blocked=true;assert.equal((await save('home.hero.cta','Reserve')).status,403);assert.equal(rows.size,0)
 blocked=false;assert.equal((await save('home.hero.href','javascript:alert(1)')).status,400);assert.equal(rows.size,0)
 assert.equal((await save('home.hero.href','/private-tours')).status,200);assert.equal(rows.get('home.hero.href'),'/private-tours')
 assert.equal((await save('home.hero.cta','Reserve now')).status,200);assert.equal(rows.get('home.hero.cta'),'Reserve now')
 assert.equal((await save('home.hero.cta','')).status,200);assert.equal(rows.has('home.hero.cta'),false)
})

test('public content exposes the normalized company WhatsApp setting and known content only, without database writes',async()=>{
 const exports:Record<string,()=>Promise<Response>>={}
 const source=ts.transpileModule(readFileSync('src/app/api/public/site/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(source,{exports,require:(name:string)=>{
  if(name==='@/lib/whatsapp')return {companyWhatsAppNumber}
  if(name==='@/lib/content/blocks')return {SITE_DEFAULTS}
  if(name==='@/lib/api')return {apiHandler:(fn:unknown)=>fn,jsonOk:Response.json,prisma:{siteBlock:{findMany:async()=>[{key:'home.hero.title',value:'Saved heading'},{key:'private.setting',value:'must-not-be-public'}]},companySettings:{findUnique:async(input:unknown)=>{assert.equal(JSON.stringify(input),JSON.stringify({where:{id:'singleton'},select:{whatsappE164:true}}));return {whatsappE164:'+354 555 0100'}}}}}
  throw Error('Unexpected fixture import')
 }})
 const result=await(await exports.GET()).json()
 assert.equal(result.whatsappE164,'+3545550100')
 assert.equal(result.blocks['home.hero.title'],'Saved heading')
 assert.equal(result.blocks['private.setting'],undefined)
})
