import { PrismaClient } from '@prisma/client'
import { publishOfficialCatalogue } from '../src/lib/catalogue/publish'

const prisma = new PrismaClient()

async function main() {
  const result = await publishOfficialCatalogue(prisma)
  console.log(JSON.stringify({ event: 'catalogue.publish', ...result }))
  if (result.reason === 'conflict') process.exitCode = 1
}

main()
  .catch(() => {
    console.error(JSON.stringify({ event: 'catalogue.publish', applied: false, reason: 'unavailable' }))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
