import type { PrismaClient } from '@prisma/client'
import { applyCatalogueRestore, previewCatalogueRestore } from './restore'

/** Bump this when a new official list should replace the live catalogue on the next VPS start. */
export const OFFICIAL_CATALOGUE_VERSION = '2026-11-taxi-tours'
const MARKER_KEY = 'catalogue.official-price-list'

/** Publish the official price list once. A later start leaves admin edits in place. */
export async function publishOfficialCatalogue(db: PrismaClient) {
  const current = await db.siteBlock.findUnique({ where: { key: MARKER_KEY } })
  if (current?.value === OFFICIAL_CATALOGUE_VERSION) return { applied: false as const, reason: 'already-live' as const }

  const plan = await previewCatalogueRestore(db)
  if (plan.conflicts.length) return { applied: false as const, reason: 'conflict' as const }
  const result = await applyCatalogueRestore(db, plan.fingerprint, true)
  await db.siteBlock.upsert({
    where: { key: MARKER_KEY },
    create: { key: MARKER_KEY, value: OFFICIAL_CATALOGUE_VERSION },
    update: { value: OFFICIAL_CATALOGUE_VERSION },
  })
  return { applied: true as const, reason: 'published' as const, changed: result.changed }
}
