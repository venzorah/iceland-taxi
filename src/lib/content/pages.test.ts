import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { z } from 'zod'
import { SITE_BLOCKS, SITE_DEFAULTS, sitePhoto } from './blocks'
import { safeHeroHref } from './hero'
import { CONTENT_PAGES, pageKeys, sharedContentKey } from './pages'

test('page editors include all existing fields, group each hero with its image, and retain shared content',()=>{
 const known=new Set(SITE_BLOCKS.map(block=>block.key))
 const all=new Set(CONTENT_PAGES.flatMap(page=>pageKeys(page)))
 assert.deepEqual([...all].sort(),[...known].sort())
 const home=CONTENT_PAGES.find(page=>page.id==='home')!
 assert(home.sections[0].keys.includes('image.hero'))
 assert(home.sections[0].keys.includes('home.hero.title'))
 assert(home.sections[1].keys.includes('image.airport'))
 assert(home.sections[1].keys.includes('home.hero.airport.href'))
 assert(pageKeys(CONTENT_PAGES.find(page=>page.id==='about')!).includes('about.title'))
 assert(sharedContentKey('image.airport'));assert(sharedContentKey('faq.0.q'))
 assert(!sharedContentKey('home.hero.cta'))
 assert.equal(sitePhoto(SITE_DEFAULTS['image.reykjavik'],{'image.reykjavik':'/photos/updated.webp'}),'/photos/updated.webp')
})

test('page saves validate every field first and commit or roll back the whole batch',async()=>{
 const rows=new Map<string,string>([['home.hero.title','Original']]);let writes=0,fail=false,blocked=false
 const exports:Record<string,(req:Request)=>Promise<Response>>={}
 const model={deleteMany:async({where}:{where:{key:string}})=>{writes++;rows.delete(where.key)},upsert:async({create}:{create:{key:string;value:string}})=>{writes++;if(fail&&create.key==='home.hero.body')throw Error('Fixture write failure');rows.set(create.key,create.value)}}
 const prisma={siteBlock:model,$transaction:async(run:(tx:unknown)=>Promise<unknown>)=>{const before=new Map(rows);try{return await run({siteBlock:model})}catch(e){rows.clear();for(const [k,v] of before)rows.set(k,v);throw e}}}
 const source=ts.transpileModule(readFileSync('src/app/api/admin/site-blocks/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(source,{exports,URL,require:(name:string)=>{
  if(name==='zod')return {z}
  if(name==='@/lib/content/hero')return {safeHeroHref}
  if(name==='@/lib/content/blocks')return {SITE_BLOCKS,SITE_DEFAULTS}
  if(name==='@/lib/auth/admin-access')return {rejectDriverOnly:async()=>blocked?Response.json({ok:false},{status:403}):null}
  if(name==='@/lib/api')return {prisma,apiHandler:(fn:unknown)=>fn,jsonOk:Response.json,jsonError:(status:number,code:string,message:string)=>Response.json({code,message},{status})}
  throw Error('Unexpected fixture import')
 }})
 const save=(updates:{key:string;value:string}[])=>exports.PUT(new Request('https://fixture.invalid/api/admin/site-blocks',{method:'PUT',body:JSON.stringify({updates})}))
 const updates=[{key:'home.hero.title',value:'New title'},{key:'home.hero.body',value:'New body'}]
 blocked=true;assert.equal((await save(updates)).status,403);assert.equal(writes,0);blocked=false
 assert.equal((await save([...updates,{key:'home.hero.href',value:'javascript:bad'}])).status,400);assert.equal(writes,0)
 assert.equal((await save([updates[0],updates[0]])).status,400);assert.equal(writes,0)
 fail=true;await assert.rejects(save(updates));assert.deepEqual([...rows],[['home.hero.title','Original']])
 fail=false;assert.equal((await save(updates)).status,200);assert.equal(rows.get('home.hero.title'),'New title');assert.equal(rows.get('home.hero.body'),'New body')
 const reset=await(await save([{key:'home.hero.title',value:''}])).json();assert.equal(reset.updates[0].value,SITE_DEFAULTS['home.hero.title']);assert.equal(rows.has('home.hero.title'),false)
})
