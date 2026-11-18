// Read-only cPanel diagnostics. Prints status/codes, never credentials or connection URLs.
const os = require('node:os')
require('@next/env').loadEnvConfig(process.cwd())
const settings = ['DATABASE_URL','DIRECT_URL','BETTER_AUTH_SECRET','NEXT_PUBLIC_APP_URL','BOOKING_ACCESS_SECRET']
console.log('Node:',process.version,'Platform:',os.platform(),os.arch(),'OpenSSL:',process.versions.openssl)
console.log('Node >=22:',Number(process.versions.node.split('.')[0])>=22)
for(const name of settings) console.log(name+':',process.env[name]?.trim()?'present':'MISSING')
try {
 const lock = require('../package-lock.json')
 for (const name of ['next','better-auth','@prisma/client']) {
  const installed=require(name+'/package.json').version
  const expected=lock.packages['node_modules/'+name]?.version
  console.log(name+':',installed,'matches uploaded lockfile:',installed===expected)
 }
} catch(error) { console.log('Dependency verification:',error.code||error.name); console.log('Action: upload the matching package files and run npm ci in the application root.') }
try { const url=new URL(process.env.NEXT_PUBLIC_APP_URL||''); console.log('Application URL is valid HTTP(S):',['http:','https:'].includes(url.protocol)&&!url.username&&!url.password) } catch { console.log('Application URL is valid HTTP(S): false; include http:// or https://') }
let db
async function run(){
 try {
  console.log('Database-backed authentication uses Prisma; verify BETTER_AUTH_SECRET separately')
  const {PrismaClient}=require('@prisma/client')
  const raw=process.env.DATABASE_URL
  if(!raw){console.log('Database test: skipped (missing runtime URL)');process.exitCode=1;return}
  let url
  try{url=new URL(raw)}catch{console.log('Database URL: invalid syntax');process.exitCode=1;return}
  console.log('Database protocol valid:',['postgres:','postgresql:'].includes(url.protocol))
  console.log('Database is loopback:',['localhost','127.0.0.1','[::1]'].includes(url.hostname))
  for(const [key,value] of Object.entries({connection_limit:'1',connect_timeout:'10',pool_timeout:'15',socket_timeout:'15',sslmode:'require'}))if(!url.searchParams.has(key))url.searchParams.set(key,value)
  db=new PrismaClient({datasourceUrl:url.toString()})
  console.log('Prisma Client constructor: passed')
  await db.$queryRaw`SELECT 1`
  console.log('Database engine and SELECT 1: passed')
 } catch(error){
  const message=String(error?.message||'')
  console.log('Diagnostic failed:',error?.code||error?.name||'UNKNOWN')
  if(/did not initialize|prisma generate|\.prisma\/client/i.test(message))console.log('Action: run npx prisma generate in the application root using the cPanel Node environment.')
  if(/query engine|binary target|openssl|libssl/i.test(message))console.log('Action: generate Prisma Client on this Linux host; check its OpenSSL and runtime dependencies.')
  if(/cannot find module|module_not_found/i.test(message)||error?.code==='MODULE_NOT_FOUND')console.log('Action: install Linux dependencies with npm ci, then npx prisma generate. Do not upload macOS node_modules.')
  if(error?.code==='P1000')console.log('Action: verify database credentials privately on the host.')
  if(['P1001','P1002','P1017','P2024'].includes(error?.code))console.log('Action: verify outbound database connectivity, TLS and pool limits with the host.')
  process.exitCode=1
 } finally {if(db)await db.$disconnect().catch(()=>{})}
}
run()
