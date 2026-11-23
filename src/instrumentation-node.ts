import { PHASE_PRODUCTION_BUILD } from 'next/constants'

/** The VPS compile has no database credentials. Publishing happens when the built app starts. */
export async function publishCatalogueOnStart() {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return
  const raw = process.env.DATABASE_URL
  if (!raw) return
  let host = ''
  try {
    host = new URL(raw).hostname
  } catch {
    return
  }
  if (!host || host === 'HOST') return

  try {
    const { prisma } = await import('@/lib/prisma')
    const { publishOfficialCatalogue } = await import('@/lib/catalogue/publish')
    const result = await publishOfficialCatalogue(prisma)
    console.log(JSON.stringify({ event: 'catalogue.publish', applied: result.applied, reason: result.reason }))
  } catch {
    console.error(JSON.stringify({ event: 'catalogue.publish', applied: false, reason: 'unavailable' }))
  }
}
