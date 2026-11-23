import { PrismaClient } from '@prisma/client'
import { applyCatalogueRestore, previewCatalogueRestore } from '../src/lib/catalogue/restore'

const prisma = new PrismaClient()

async function main() {
  const plan = await previewCatalogueRestore(prisma)
  if (plan.conflicts.length) {
    console.error(plan.conflicts.join('\n'))
    process.exitCode = 1
    return
  }
  const result = await applyCatalogueRestore(prisma, plan.fingerprint, false)
  console.log(`Catalogue updated: ${result.changed} changes. Booking amounts were left as saved.`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Could not update the catalogue')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
