import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

async function run(args:string[]) {
 let reads=0,writes=0,disconnected=false
 const process={argv:['node','command',...args],exitCode:0}
 const fingerprint='a'.repeat(64)
 const source=ts.transpileModule(readFileSync('scripts/replace-official-catalogue.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(source,{exports:{},process,console:{log:()=>{},error:()=>{}},require:(name:string)=>{
  if(name==='@prisma/client')return {PrismaClient:class {$disconnect=async()=>{disconnected=true}}}
  if(name.endsWith('/publish'))return {OFFICIAL_CATALOGUE_VERSION:'fixture-version'}
  if(name.endsWith('/restore'))return {previewCatalogueRestore:async()=>{reads++;return {fingerprint,actions:[],conflicts:[],rateNeedsRestore:false,currentEurRate:150}},applyCatalogueRestore:async(_db:unknown,approved:string,rate:boolean,marker:{value:string})=>{assert.equal(approved,fingerprint);assert(rate);assert.equal(marker.value,'fixture-version');writes++;return {changed:1,rateRestored:true}}}
  throw Error('Unexpected fixture import')
 }})
 await new Promise(resolve=>setImmediate(resolve))
 assert(disconnected)
 return {reads,writes,code:process.exitCode}
}
test('catalogue operator command defaults fail closed; preview and verification cannot write',async()=>{
 assert.deepEqual(await run([]),{reads:0,writes:0,code:1})
 assert.equal((await run(['--preview'])).writes,0)
 assert.equal((await run(['--verify'])).writes,0)
 assert.equal((await run(['--apply'])).writes,0)
 assert.equal((await run(['--apply','invalid'])).writes,0)
 assert.equal((await run(['--apply','a'.repeat(64)])).writes,1)
})
