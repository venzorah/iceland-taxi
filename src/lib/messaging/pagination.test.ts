import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
test('actual thread query pages 205 messages without dropping history or breaking chronological display',async()=>{
 const rows=Array.from({length:205},(_,i)=>({id:`fixture-${String(i).padStart(3,'0')}`,body:'Fixture',createdAt:new Date(1700000000000+i),authorRole:'customer',guestName:null,guestEmail:null,author:null,unread:false,channel:'customer_ops'})).reverse()
 const imports:Record<string,unknown>={'@/lib/prisma':{prisma:{booking:{findUnique:async({include}:{include:{messages:{take:number;cursor?:{id:string};where:unknown}}})=>{
  assert.equal(include.messages.take,101);assert.deepEqual(JSON.parse(JSON.stringify(include.messages.where)),{channel:{not:'driver_ops'}})
  const start=include.messages.cursor?rows.findIndex(r=>r.id===include.messages.cursor!.id)+1:0
  return{ref:'FIXTURE',messages:rows.slice(start,start+include.messages.take)}
 }}}},'@/lib/push/send':{},'@/lib/customer/ownership':{},'@/lib/messaging/read-state':{chatAuthorName:()=> 'Fixture'}}
 // Uncalled imports remain inert; unexpected function use fails the fixture.
 const source=ts.transpileModule(readFileSync('src/lib/messaging/service.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const exports:Record<string,unknown>={};vm.runInNewContext(source,{exports,require:(name:string)=>imports[name]||{},Date,Map,Set})
 const get=exports.getThreadMessages as(ref:string,cursor?:string)=>Promise<{messages:{id:string}[];nextCursor:string|null}>
 const seen:string[]=[];let cursor:string|undefined
 do{const page=await get('FIXTURE',cursor);assert(page.messages.length<=100);const ids=page.messages.map(m=>m.id);assert.deepEqual(ids,[...ids].sort());seen.push(...ids);cursor=page.nextCursor||undefined}while(cursor)
 assert.equal(seen.length,205);assert.equal(new Set(seen).size,205)
})
