// Read-only verification; never prints table contents or credentials.
import env from '@next/env'
import {PrismaClient} from '@prisma/client'
env.loadEnvConfig(process.cwd())
const connection=new URL(process.env.DATABASE_TRANSACTION_URL||process.env.DATABASE_URL)
for(const [key,value] of Object.entries({connection_limit:'1',connect_timeout:'30',pool_timeout:'40',sslmode:'require'}))if(!connection.searchParams.has(key))connection.searchParams.set(key,value)
const db=new PrismaClient({datasourceUrl:connection.toString()})
try{
 const unprotected=await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false`
 if(unprotected.length)throw new Error('Public tables without RLS: '+unprotected.map(r=>r.tablename).join(', '))
 const grants=await db.$queryRaw`SELECT table_name FROM information_schema.table_privileges WHERE table_schema='public' AND table_name IN ('MediaAsset','SiteBlock','_prisma_migrations','ContactMessage','RateLimit') AND grantee IN ('anon','authenticated')`
 if(grants.length)throw new Error('Private tables have browser-role grants')
 for(const table of ['MediaAsset','SiteBlock','ContactMessage','RateLimit','_prisma_migrations']){
  const response=await fetch(new URL('/rest/v1/'+table+'?select=*&limit=1',process.env.NEXT_PUBLIC_SUPABASE_URL),{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}})
  const data=await response.json()
  if(response.ok&&(!Array.isArray(data)||data.length))throw new Error('Anonymous table access was not denied: '+table)
 }
 console.log('Public-table RLS, private-table grants and anonymous access checks passed.')
}catch(e){console.error('Database protection check failed:',e.code||e.name);process.exitCode=1}finally{await db.$disconnect()}
