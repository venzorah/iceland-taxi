import { PrismaClient } from '@prisma/client'
import { OFFICIAL_CATALOGUE_VERSION } from '../src/lib/catalogue/publish'
import { applyCatalogueRestore, previewCatalogueRestore } from '../src/lib/catalogue/restore'

// Explicit operator command only; importing this file is not part of startup/build.
const prisma = new PrismaClient()
async function main() {
  const args = process.argv.slice(2)
  const mode = args[0]
  if (!['--preview', '--apply', '--verify'].includes(mode) || args.length !== (mode === '--apply' ? 2 : 1)) throw new Error('Usage: --preview | --apply <reviewed-fingerprint> | --verify')
  const plan = await previewCatalogueRestore(prisma)
  if (mode === '--preview') { console.log(JSON.stringify(plan, null, 2)); return }
  if (mode === '--verify') {
    const valid = !plan.conflicts.length && !plan.actions.length && !plan.rateNeedsRestore
    console.log(JSON.stringify({ valid, pendingChanges: plan.actions.length, conflicts: plan.conflicts.length, eurRate: plan.currentEurRate }))
    if (!valid) process.exitCode = 1
    return
  }
  const fingerprint = args[1]
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('A reviewed preview fingerprint is required.')
  const result = await applyCatalogueRestore(prisma, fingerprint, true, { key: 'catalogue.official-price-list', value: OFFICIAL_CATALOGUE_VERSION })
  console.log(JSON.stringify({ event: 'catalogue.publish', changed: result.changed, rateRestored: result.rateRestored }))
}
main().catch(() => {
  console.error('Catalogue command failed. No success is assumed; obtain a fresh preview and review protected operator logs. Private database details suppressed.')
  process.exitCode = 1
}).finally(async () => { await prisma.$disconnect() })
