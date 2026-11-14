import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Keep concurrent polling within a small pool and allow time for remote TLS setup.
const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
if (databaseUrl) {
  for (const [key, value] of Object.entries({ connection_limit: '3', connect_timeout: '10', pool_timeout: '20', socket_timeout: '20', sslmode: 'require' })) {
    if (!databaseUrl.searchParams.has(key)) databaseUrl.searchParams.set(key, value)
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasourceUrl: databaseUrl.toString() } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
