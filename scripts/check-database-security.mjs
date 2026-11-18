// Read-only standard PostgreSQL runtime-role verification. No provider Data API is used.
import env from '@next/env'
import {PrismaClient} from '@prisma/client'
env.loadEnvConfig(process.cwd())
const db=new PrismaClient({log:[]})
try{
 const [role]=await db.$queryRaw`SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user`
 if(!role||Object.values(role).some(Boolean))throw new Error('Unprivileged runtime role required')
 const unprotected=await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false`
 if(unprotected.length)throw new Error('Application tables must have RLS')
 const grants=await db.$queryRaw`SELECT table_name FROM information_schema.table_privileges WHERE table_schema='public' AND grantee='PUBLIC'`
 if(grants.length)throw new Error('Public table grants must be removed')
 const [privileges]=await db.$queryRaw`SELECT has_schema_privilege(current_user,'public','CREATE') AS schema_write,has_table_privilege(current_user,'public._prisma_migrations','UPDATE') AS migration_write,EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner WHERE n.nspname='public' AND r.rolname=current_user) AS owns_tables`
 if(Object.values(privileges).some(Boolean))throw new Error('Runtime must not own schema objects or edit migration history')
 console.log('Unprivileged runtime role, public-table RLS, private grants and migration-history restrictions: passed')
}catch(error){console.error('Database protection check failed:',error.code||error.name);process.exitCode=1}
finally{await db.$disconnect()}
