import { PHASE_PRODUCTION_BUILD } from 'next/constants'

/** Opt-in runtime operation only. Ordinary starts, development and builds never publish. */
export async function publishCatalogueOnStart(load = async () => {
  const { prisma } = await import('@/lib/prisma')
  const { publishOfficialCatalogue } = await import('@/lib/catalogue/publish')
  return () => publishOfficialCatalogue(prisma)
}) {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD || process.env.NODE_ENV !== 'production' || process.env.PUBLISH_OFFICIAL_CATALOGUE_ON_START !== 'true') return
  const raw = process.env.DATABASE_URL
  if (!raw) return
  try {
    const host = new URL(raw).hostname
    if (!host || host === 'HOST') return
  } catch { return }
  try {
    const publish = await load()
    const result = await publish()
    console.log(JSON.stringify({ event: 'catalogue.publish', applied: result.applied, reason: result.reason }))
  } catch {
    console.error(JSON.stringify({ event: 'catalogue.publish', applied: false, reason: 'unavailable' }))
  }
}
