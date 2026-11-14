import nextEnv from '@next/env'
import { PrismaClient } from '@prisma/client'
nextEnv.loadEnvConfig(process.cwd())
const prisma = new PrismaClient()
try {
  const auth = await fetch(new URL('/auth/v1/settings', process.env.NEXT_PUBLIC_SUPABASE_URL), {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
  })
  console.log('Supabase Auth configuration accessible:', auth.ok)
  if (!auth.ok) process.exitCode = 1
  const settings = auth.ok ? await auth.json() : null
  if (settings) console.log('Email authentication enabled:', settings.external?.email === true)
  const marker = `connection-check-${crypto.randomUUID()}`
  const rollback = new Error('ROLLBACK_CONNECTION_CHECK')
  try {
    await prisma.$transaction(async tx => {
      await tx.integrationStatus.create({ data: { key: marker, label: 'Temporary connection verification' } })
      const found = await tx.integrationStatus.findUnique({ where: { key: marker } })
      if (!found) throw new Error('Database read after write failed')
      console.log('Application database write/read: passed')
      throw rollback
    })
  } catch (error) { if (error !== rollback) throw error }
  console.log('Temporary verification record rolled back:', !(await prisma.integrationStatus.findUnique({ where: { key: marker } })))
  const rows = await prisma.$queryRaw`SELECT count(*)::int AS count FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations' AND rowsecurity = true`
  console.log('Application tables with row level security:', rows[0].count)
} catch (error) {
  console.error('Connection verification failed:', error.code || error.name)
  process.exitCode = 1
} finally { await prisma.$disconnect() }
