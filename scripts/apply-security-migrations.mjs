// Fallback for hosts where the schema-engine connection fails but Prisma queries work.
// Applies only these reviewed additive migrations, atomically with their history records.
import env from '@next/env'
import {PrismaClient} from '@prisma/client'
import {createHash,randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
env.loadEnvConfig(process.cwd())
const names=['20261114010000_content_rls','20261114020000_contact_security']
const checksum=sql=>createHash('sha256').update(sql).digest('hex')
function statements(sql){
 const parts=[];let current='',dollar=false,single=false,double=false
 for(let i=0;i<sql.length;i++){
  const c=sql[i],next=sql[i+1]
  if(!single&&!double&&c==='$'&&next==='$'){dollar=!dollar;current+='$$';i++;continue}
  if(!dollar){
   if(!double&&c==="'"){if(single&&next==="'"){current+="''";i++;continue}single=!single}
   if(!single&&c==='"')double=!double
   if(!single&&!double&&c===';'){if(current.trim())parts.push(current.trim());current='';continue}
  }
  current+=c
 }
 if(current.trim())parts.push(current.trim())
 return parts.filter(s=>!['BEGIN','COMMIT'].includes(s.replace(/^--[^\n]*\n/g,'').trim()))
}
const connection=new URL(process.env.DATABASE_TRANSACTION_URL||process.env.DATABASE_URL)
connection.searchParams.set('connection_limit','1');connection.searchParams.set('connect_timeout','30');connection.searchParams.set('pool_timeout','40')
const db=new PrismaClient({datasourceUrl:connection.toString()})
try{
 await db.$transaction(async tx=>{
  // Same advisory key used by Prisma migration tooling; transaction lock releases on rollback.
  const locked=await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(72707369) AS locked`
  if(!locked[0].locked)throw new Error('Another migrator is running')
  const history=await tx.$queryRaw`SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations"`
  for(const row of history){
   if(row.rolled_back_at)continue
   if(!row.finished_at)throw new Error('Unfinished migration requires review')
   if(checksum(readFileSync(`prisma/migrations/${row.migration_name}/migration.sql`,'utf8'))!==row.checksum)throw new Error('Existing migration checksum mismatch')
  }
  for(const name of names){
   if(history.some(r=>r.migration_name===name&&r.finished_at&&!r.rolled_back_at)){console.log('Already applied:',name);continue}
   const sql=readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8')
   // Static repository migration statements only. Never interpolate request data here.
   for(const statement of statements(sql))await tx.$executeRawUnsafe(statement)
   await tx.$executeRaw`INSERT INTO "_prisma_migrations" (id,checksum,migration_name,started_at,finished_at,applied_steps_count) VALUES (${randomUUID()},${checksum(sql)},${name},NOW(),NOW(),1)`
   console.log('Applied:',name)
  }
 },{maxWait:20000,timeout:60000})
 console.log('Security migrations committed with verified history.')
}catch(e){console.error('Security migration failed; transaction rolled back:',e.code||e.name);process.exitCode=1}finally{await db.$disconnect()}
