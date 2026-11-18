// Default is read-only. Optional --check-write performs a local-only rolled-back probe.
import nextEnv from '@next/env'
import {PrismaClient} from '@prisma/client'
nextEnv.loadEnvConfig(process.cwd())
const prisma=new PrismaClient({log:[]})
try{
 await prisma.$queryRaw`SELECT 1`
 const tables=await prisma.$queryRaw`SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public' AND tablename IN ('AuthIdentity','AuthAccount','AuthSession','AuthVerification','AuthRateLimit')`
 console.log('Database reachable: true; authentication tables present:',tables[0].count===5)
 console.log('Authentication signing secret configured:',(process.env.BETTER_AUTH_SECRET?.length||0)>=32)
 if(tables[0].count!==5)process.exitCode=1
 if(process.argv.includes('--check-write')){
  const url=new URL(process.env.DATABASE_URL)
  if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('Loopback-only write probe')
  const marker=`connection-check-${crypto.randomUUID()}`,rollback=new Error('ROLLBACK_CONNECTION_CHECK')
  try{await prisma.$transaction(async tx=>{
   await tx.integrationStatus.create({data:{key:marker,label:'Temporary connection verification'}})
   if(!await tx.integrationStatus.findUnique({where:{key:marker}}))throw new Error('Read failed')
   throw rollback
  })}catch(error){if(error!==rollback)throw error}
  if(await prisma.integrationStatus.findUnique({where:{key:marker}}))throw new Error('Rollback failed')
  console.log('Local application write/read and rollback: passed')
 }
}catch(error){console.error('Connection verification failed:',error.code||error.name);process.exitCode=1}
finally{await prisma.$disconnect()}
