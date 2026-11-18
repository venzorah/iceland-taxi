// Read-only inventory. Prints metadata and aggregate counts, never credentials or password hashes.
import nextEnv from '@next/env'
import { PrismaClient } from '@prisma/client'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
nextEnv.loadEnvConfig(process.cwd())
const raw = process.env.MIGRATION_SOURCE_URL || process.env.DIRECT_URL
if (!raw) throw new Error('Set MIGRATION_SOURCE_URL or DIRECT_URL privately')
let url
try { url = new URL(raw); if (!['postgresql:', 'postgres:'].includes(url.protocol)) throw new Error() }
catch { console.error('Invalid PostgreSQL connection configuration'); process.exit(1) }
for (const [key,value] of Object.entries({connection_limit:'1',connect_timeout:'10',pool_timeout:'10',socket_timeout:'30'})) url.searchParams.set(key,value)
const db = new PrismaClient({datasourceUrl:url.href,log:[]})
try {
 const result = await db.$transaction(async tx => {
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
  const server = await tx.$queryRaw`SELECT current_setting('server_version') AS version, pg_encoding_to_char(encoding) AS encoding, datcollate AS collation FROM pg_database WHERE datname=current_database()`
  const extensions = await tx.$queryRaw`SELECT extname, extversion, nspname AS schema FROM pg_extension JOIN pg_namespace ON pg_namespace.oid=extnamespace ORDER BY extname`
  const migrations = await tx.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count FROM public._prisma_migrations ORDER BY started_at`
  for (const migration of migrations) {
   try { migration.local_checksum_matches = createHash('sha256').update(await readFile(`prisma/migrations/${migration.migration_name}/migration.sql`)).digest('hex') === migration.checksum }
   catch { migration.local_checksum_matches = false }
  }
  const tables = await tx.$queryRaw`SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname IN ('public','auth','storage') ORDER BY schemaname,tablename`
  const routines = await tx.$queryRaw`SELECT n.nspname AS schema, p.proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY p.proname`
  const triggers = await tx.$queryRaw`SELECT event_object_schema AS schema,event_object_table AS table_name,trigger_name,action_timing,action_orientation FROM information_schema.triggers WHERE event_object_schema IN ('public','auth') ORDER BY 1,2,3`
  const policies = await tx.$queryRaw`SELECT schemaname,tablename,policyname,roles,cmd,permissive FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname`
  const accounts = await tx.$queryRaw`SELECT role, count(*)::int AS accounts, count("authId")::int AS linked, count("passwordHash")::int AS legacy_password_fields FROM public."User" GROUP BY role ORDER BY role`
  const [authExists] = await tx.$queryRaw`SELECT to_regclass('auth.users') IS NOT NULL AS exists`
  let auth = null
  if (authExists.exists) {
   auth = {
    users: await tx.$queryRaw`SELECT count(*)::int AS total, count(email_confirmed_at)::int AS confirmed, count(*) FILTER (WHERE encrypted_password ~ '^\\$2[aby]\\$')::int AS bcrypt, count(*) FILTER (WHERE encrypted_password IS NULL OR encrypted_password='')::int AS no_password, count(*) FILTER (WHERE banned_until > now())::int AS banned FROM auth.users`,
    providers: await tx.$queryRaw`SELECT provider,count(*)::int AS identities FROM auth.identities GROUP BY provider ORDER BY provider`,
    linking: await tx.$queryRaw`SELECT count(*) FILTER (WHERE u."authId" IS NOT NULL AND a.id IS NULL)::int AS broken_links, count(*) FILTER (WHERE u."authId" IS NULL)::int AS unlinked_application_users FROM public."User" u LEFT JOIN auth.users a ON a.id=u."authId"`,
    authOnly: await tx.$queryRaw`SELECT count(*)::int AS accounts_without_application_row FROM auth.users a LEFT JOIN public."User" u ON u."authId"=a.id WHERE u.id IS NULL`,
    mfa: await tx.$queryRaw`SELECT factor_type,status,count(*)::int AS factors FROM auth.mfa_factors GROUP BY factor_type,status`,
   }
  }
  const storage = authExists.exists ? await tx.$queryRaw`SELECT (SELECT count(*)::int FROM storage.buckets) AS buckets, (SELECT count(*)::int FROM storage.objects) AS objects` : null
  return {server,extensions,migrations,tables,routines,triggers,policies,accounts,auth,storage}
 }, {isolationLevel:'RepeatableRead',timeout:120000,maxWait:10000})
 console.log(JSON.stringify(result,null,2))
} catch (error) { console.error('Read-only source inspection failed:',error.code || error.name); process.exitCode=1 }
finally { await db.$disconnect() }
