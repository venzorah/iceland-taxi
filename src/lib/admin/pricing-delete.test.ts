import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { z } from 'zod'

test('add-on deletion respects permission gates and reports a missing record without a server error', async () => {
 let blocked=false, missing=false, writes=0
 const exports: Record<string, (req: Request) => Promise<Response>>={}
 const source=ts.transpileModule(readFileSync('src/app/api/admin/pricing/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(source,{exports,process:{env:{DATABASE_URL:'fixture'}},URL,require:(name:string)=>{
  if(name==='zod')return {z}
  if(name==='@/lib/auth/admin-access')return {rejectDriverOnly:async()=>blocked?Response.json({ok:false},{status:403}):null}
  if(name==='@/lib/api')return {apiHandler:(handler:unknown)=>handler,jsonOk:Response.json,jsonError:(status:number,code:string,message:string)=>Response.json({code,message},{status}),prisma:{pricingExtra:{delete:async()=>{writes++;if(missing)throw {code:'P2025'}}}}}
  throw Error('Unexpected fixture import')
 }})
 blocked=true;assert.equal((await exports.DELETE(new Request('https://fixture.invalid/api/admin/pricing?id=extra'))).status,403);assert.equal(writes,0)
 blocked=false;assert.equal((await exports.DELETE(new Request('https://fixture.invalid/api/admin/pricing'))).status,400);assert.equal(writes,0)
 missing=true;assert.equal((await exports.DELETE(new Request('https://fixture.invalid/api/admin/pricing?id=extra'))).status,404)
 missing=false;assert.equal((await exports.DELETE(new Request('https://fixture.invalid/api/admin/pricing?id=extra'))).status,200)
})
