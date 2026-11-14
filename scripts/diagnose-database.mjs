import nextEnv from '@next/env'
import { PrismaClient } from '@prisma/client'
nextEnv.loadEnvConfig(process.cwd())
for (const name of ['DATABASE_URL', 'DIRECT_URL']) {
  if (!process.env[name]) continue
  const url = new URL(process.env[name])
  url.searchParams.set('connection_limit', '1')
  url.searchParams.set('connect_timeout', '8')
  url.searchParams.set('pool_timeout', '8')
  const client = new PrismaClient({ datasourceUrl: url.toString() })
  const samples = []
  try {
    for (let i = 0; i < 4; i++) {
      const start = performance.now()
      await client.$queryRaw`SELECT 1`
      samples.push(Math.round(performance.now() - start))
    }
    console.log(JSON.stringify({ connection: name, port: url.port, milliseconds: samples }))
    if (process.argv.includes('--activity')) {
      const rows = await client.$queryRaw`SELECT state, wait_event_type, wait_event, count(*)::int AS connections FROM pg_stat_activity WHERE datname = current_database() GROUP BY state, wait_event_type, wait_event ORDER BY connections DESC`
      console.log(JSON.stringify({ activity: rows }))
    }
  } catch (error) { console.log(JSON.stringify({ connection: name, port: url.port, error: error.code || error.name, samples })) }
  finally { await client.$disconnect() }
}
