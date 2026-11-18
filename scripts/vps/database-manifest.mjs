// Read-only, consistent content fingerprints. Output contains counts/digests, no row data.
// Usage: MIGRATION_DATABASE_URL=... node scripts/vps/database-manifest.mjs /private/path/source.json
// Prefer setting MIGRATION_DATABASE_URL in a private environment file, never in shell history.
import nextEnv from '@next/env'
import { PrismaClient } from '@prisma/client'
import {createHash} from 'node:crypto'
import {writeFile} from 'node:fs/promises'
nextEnv.loadEnvConfig(process.cwd())
const output = process.argv[2]
if (!output || process.argv.length !== 3 || !process.env.MIGRATION_DATABASE_URL) {
 console.error('Set MIGRATION_DATABASE_URL privately and supply one new manifest file path'); process.exit(1)
}
let url
try { url = new URL(process.env.MIGRATION_DATABASE_URL); if (!['postgresql:', 'postgres:'].includes(url.protocol)) throw new Error() }
catch { console.error('Invalid PostgreSQL connection configuration'); process.exit(1) }
for (const [key,value] of Object.entries({connection_limit:'1',connect_timeout:'10',pool_timeout:'10',socket_timeout:'30'})) url.searchParams.set(key,value)
const db = new PrismaClient({datasourceUrl:url.href,log:[]})
const quote = name => '"' + name.replaceAll('"','""') + '"'
try {
 const tables = await db.$transaction(async tx => {
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
  // Fail instead of silently fingerprinting an RLS-filtered subset of rows.
  await tx.$executeRawUnsafe('SET LOCAL row_security = off')
  await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'")
  await tx.$executeRawUnsafe("SET LOCAL DateStyle = 'ISO, YMD'")
  await tx.$executeRawUnsafe('SET LOCAL extra_float_digits = 3')
  const names = await tx.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename COLLATE "C"`
  const result = {}
  for (const {tablename} of names) {
   // Canonical JSONB text, sorted using bytewise collation, includes every column and timestamp.
   // A cursor bounds Node memory even for larger Message/Booking/Payment tables.
   await tx.$executeRawUnsafe(`DECLARE manifest_rows NO SCROLL CURSOR FOR SELECT to_jsonb(t)::text AS record FROM public.${quote(tablename)} t ORDER BY to_jsonb(t)::text COLLATE "C"`)
   const hash = createHash('sha256'); let count=0
   for (;;) {
    const rows = await tx.$queryRawUnsafe('FETCH FORWARD 500 FROM manifest_rows')
    if (!rows.length) break
    for (const {record} of rows) { hash.update(record).update('\n'); count++ }
   }
   await tx.$executeRawUnsafe('CLOSE manifest_rows')
   result[tablename] = {count,sha256:hash.digest('hex')}
  }
  return result
 },{isolationLevel:'RepeatableRead',timeout:300000,maxWait:10000})
 await writeFile(output,JSON.stringify({format:1,tables},null,2)+'\n',{mode:0o600,flag:'wx'})
 console.log(`Manifest written: ${Object.keys(tables).length} public tables. No rows were changed.`)
} catch (error) { console.error('Manifest failed:',error.code || error.name); process.exitCode=1 }
finally { await db.$disconnect() }
