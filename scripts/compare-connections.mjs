import nextEnv from '@next/env'
import { PrismaClient } from '@prisma/client'
nextEnv.loadEnvConfig(process.cwd())
for (const [name, value, tls] of [['transaction-tls', process.env.DATABASE_URL, true], ['session-tls', process.env.DIRECT_URL, true]]) {
  const url = new URL(value)
  url.searchParams.set('connection_limit', '1')
  url.searchParams.set('connect_timeout', '10')
  url.searchParams.set('pool_timeout', '10')
  if (tls) url.searchParams.set('sslmode', 'require')
  const client = new PrismaClient({ datasourceUrl: url.toString() })
  const samples = []
  try {
    for (let i = 0; i < 3; i++) { const start = performance.now(); await client.$queryRaw`SELECT 1`; samples.push(Math.round(performance.now() - start)) }
    console.log(JSON.stringify({ mode: name, milliseconds: samples }))
  } catch (error) { console.log(JSON.stringify({ mode: name, error: error.code || error.name, samples })) }
  finally { await client.$disconnect() }
}
