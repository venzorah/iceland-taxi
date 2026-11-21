// Additive, reviewed catalogue restore only. No seed/reset/migration or external API calls.
// Preview: node --env-file=/etc/iceland-taxi/app.env --import tsx scripts/vps/restore-catalogue.ts --target-database iceland_taxi
// Apply: add --apply --fingerprint HASH_FROM_PREVIEW --restore-eur-rate
import { PrismaClient } from '@prisma/client'
import { applyCatalogueRestore, previewCatalogueRestore } from '../../src/lib/catalogue/restore'

async function main() {
  const args = process.argv.slice(2), value = (name: string) => args[args.indexOf(name) + 1]
  if (!args.includes('--target-database') || !value('--target-database')) throw new Error('TARGET_DATABASE_REQUIRED')
  const connection = new URL(process.env.DATABASE_URL || '')
  if (decodeURIComponent(connection.pathname.slice(1)) !== value('--target-database')) throw new Error('TARGET_DATABASE_MISMATCH')
  const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL, log: [] })
  try {
    const plan = await previewCatalogueRestore(db)
    if (!args.includes('--apply')) {
      console.log(JSON.stringify({ mode: 'preview-only', plan }, null, 2))
      return
    }
    if (!args.includes('--fingerprint') || !/^[a-f0-9]{64}$/.test(value('--fingerprint') || '')) throw new Error('REVIEWED_PREVIEW_FINGERPRINT_REQUIRED')
    const result = await applyCatalogueRestore(db, value('--fingerprint'), args.includes('--restore-eur-rate'))
    console.log(JSON.stringify({ mode: 'applied', ...result }, null, 2))
  } finally { await db.$disconnect() }
}
void main().catch((error: { code?: string; message?: string }) => {
  const known = ['TARGET_DATABASE_REQUIRED', 'TARGET_DATABASE_MISMATCH', 'REVIEWED_PREVIEW_FINGERPRINT_REQUIRED']
  console.error('Catalogue restore stopped:', error.code || (known.includes(error.message || '') ? error.message : 'Unable to complete. Verify the reviewed target, connection and preview; no raw private error is displayed.'))
  process.exitCode = 1
})
