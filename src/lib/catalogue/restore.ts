import { createHash } from 'node:crypto'
import { Prisma, type PrismaClient, type Service, type Route, type ExchangeRate, type SiteBlock } from '@prisma/client'
import { SITE_BLOCKS } from '@/lib/content/blocks'
import { HttpError } from '@/lib/security/http'
import { REFERENCE_SERVICES, REFERENCE_ROUTES, REFERENCE_EUR_RATE } from './reference'

type Snapshot = { services: Service[]; routes: Route[]; rate: ExchangeRate | null; blocks: SiteBlock[] }
type Change = { field: string; before: unknown; after: unknown }
type Action = { model: 'service' | 'route' | 'siteBlock'; operation: 'create' | 'update'; id: string; label: string; data: Record<string, unknown>; changes: Change[] }
export type CatalogueRestorePlan = { fingerprint: string; actions: Action[]; warnings: string[]; conflicts: string[]; currentEurRate: number | null; referenceEurRate: number; rateNeedsRestore: boolean }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
const contentKeys = new Set(['home.airport.kicker', 'home.airport.title', 'home.airport.body', 'home.tours.title', 'home.tours.body', 'image.airport', 'image.goldenCircle', 'image.southCoast', 'image.northernLights', 'image.privateDriver', ...SITE_BLOCKS.filter(block => /^(airport|tours|driver)\./.test(block.key)).map(block => block.key)])
const referenceBlocks = SITE_BLOCKS.filter(block => contentKeys.has(block.key))

/** Deterministic plan: retain authored values/prices and IDs, fill gaps, correct reference categories. */
export function planCatalogueRestore(snapshot: Snapshot): CatalogueRestorePlan {
  const actions: Action[] = [], warnings: string[] = [], conflicts: string[] = []
  const serviceIds = new Map<string, string>()
  for (const reference of REFERENCE_SERVICES) {
    const matches = snapshot.services.filter(row => row.slug === reference.slug || normalize(row.titleEn) === normalize(reference.titleEn))
    if (matches.length > 1 || (matches[0]?.slug === reference.slug && normalize(matches[0].titleEn) !== normalize(reference.titleEn))) { conflicts.push(`Resolve duplicate or conflicting service: ${reference.titleEn}.`); continue }
    const existing = matches[0], id = existing?.id || `reference-${reference.slug}`
    serviceIds.set(reference.slug, id)
    if (!existing) {
      if (snapshot.services.some(row => row.id === id)) { conflicts.push(`The restore ID for ${reference.titleEn} is already used.`); continue }
      const data = { ...reference, active: true }
      actions.push({ model: 'service', operation: 'create', id, label: reference.titleEn, data, changes: Object.entries(data).map(([field, after]) => ({ field, before: null, after })) })
      continue
    }
    const data: Record<string, unknown> = {}
    if (existing.kind !== reference.kind) data.kind = reference.kind
    if (existing.fromIsk === null) data.fromIsk = reference.fromIsk
    else if (existing.fromIsk !== reference.fromIsk) warnings.push(`${reference.titleEn}: keeping the existing ISK ${existing.fromIsk} price (reference: ${reference.fromIsk}).`)
    for (const field of ['blurbEn', 'imageUrl', 'hoursLabel', 'paxLabel'] as const) {
      if (!existing[field]?.trim() && field in reference) data[field] = (reference as unknown as Record<string, unknown>)[field]
    }
    if (!existing.active) warnings.push(`${reference.titleEn} is hidden. Its published status will be preserved.`)
    if (Object.keys(data).length) actions.push({ model: 'service', operation: 'update', id, label: reference.titleEn, data, changes: Object.entries(data).map(([field, after]) => ({ field, before: existing[field as keyof Service], after })) })
  }
  const airportId = serviceIds.get('airport-transfer')
  for (const reference of REFERENCE_ROUTES) {
    const matches = snapshot.routes.filter(row => normalize(row.fromLabel) === normalize(reference.fromLabel) && normalize(row.toLabel) === normalize(reference.toLabel))
    const label = `${reference.fromLabel} → ${reference.toLabel}`
    if (matches.length > 1) { conflicts.push(`Resolve duplicate route: ${label}.`); continue }
    if (!airportId) continue
    const existing = matches[0], id = existing?.id || `reference-airport-${reference.key}`
    const { key: _key, ...fields } = reference
    if (!existing) {
      if (snapshot.routes.some(row => row.id === id)) { conflicts.push(`The restore ID for ${label} is already used.`); continue }
      const data = { ...fields, serviceId: airportId, active: true, returnTrip: true }
      actions.push({ model: 'route', operation: 'create', id, label, data, changes: Object.entries(data).map(([field, after]) => ({ field, before: null, after })) })
    } else {
      const data: Record<string, unknown> = {}
      if (existing.serviceId !== airportId) data.serviceId = airportId
      if (existing.minutes === null) data.minutes = reference.minutes
      if (existing.km === null) data.km = reference.km
      if (existing.fromIsk !== reference.fromIsk) warnings.push(`${label}: keeping the existing ISK ${existing.fromIsk} price (reference: ${reference.fromIsk}).`)
      if (!existing.active) warnings.push(`${label} is paused. Its published status will be preserved.`)
      if (Object.keys(data).length) actions.push({ model: 'route', operation: 'update', id, label, data, changes: Object.entries(data).map(([field, after]) => ({ field, before: existing[field as keyof Route], after })) })
    }
  }
  for (const reference of referenceBlocks) {
    if (snapshot.blocks.some(row => row.key === reference.key)) continue
    const data = { key: reference.key, value: reference.value }
    actions.push({ model: 'siteBlock', operation: 'create', id: reference.key, label: reference.label, data, changes: [{ field: 'value', before: null, after: reference.value }] })
  }
  // Sorting makes stale-preview checks independent of the database's row-return order.
  const fingerprint = createHash('sha256').update(JSON.stringify({ reference: { services: REFERENCE_SERVICES, routes: REFERENCE_ROUTES, blocks: referenceBlocks, eur: REFERENCE_EUR_RATE }, services: [...snapshot.services].sort((a, b) => a.id.localeCompare(b.id)), routes: [...snapshot.routes].sort((a, b) => a.id.localeCompare(b.id)), blocks: [...snapshot.blocks].sort((a, b) => a.key.localeCompare(b.key)), rate: snapshot.rate })).digest('hex')
  return { fingerprint, actions, warnings, conflicts, currentEurRate: snapshot.rate?.iskPerEur ?? null, referenceEurRate: REFERENCE_EUR_RATE, rateNeedsRestore: snapshot.rate?.iskPerEur !== REFERENCE_EUR_RATE }
}

async function loadSnapshot(db: Prisma.TransactionClient | PrismaClient): Promise<Snapshot> {
  const [services, routes, rate, blocks] = await Promise.all([db.service.findMany(), db.route.findMany(), db.exchangeRate.findFirst({ orderBy: { effective: 'desc' } }), db.siteBlock.findMany({ where: { key: { in: [...contentKeys] } } })])
  return { services, routes, rate, blocks }
}
export async function previewCatalogueRestore(db: PrismaClient) { return planCatalogueRestore(await loadSnapshot(db)) }

/** Additive only: no deletes, auth/booking/payment writes, or changes to saved charge snapshots. */
export async function applyCatalogueRestore(db: PrismaClient, fingerprint: string, restoreExchangeRate: boolean) {
  return db.$transaction(async tx => {
    const snapshot = await loadSnapshot(tx), plan = planCatalogueRestore(snapshot)
    if (plan.fingerprint !== fingerprint) throw new HttpError(409, 'CATALOGUE_CHANGED', 'The catalogue changed. Review a fresh preview before restoring.')
    if (plan.conflicts.length) throw new HttpError(409, 'CATALOGUE_CONFLICT', 'Resolve the conflicts shown in the preview before restoring.')
    for (const action of plan.actions) {
      if (action.model === 'service') {
        if (action.operation === 'create') await tx.service.create({ data: { id: action.id, ...action.data } as Prisma.ServiceCreateInput })
        else await tx.service.update({ where: { id: action.id }, data: action.data })
      } else if (action.model === 'route') {
        if (action.operation === 'create') await tx.route.create({ data: { id: action.id, ...action.data } as Prisma.RouteUncheckedCreateInput })
        else await tx.route.update({ where: { id: action.id }, data: action.data })
      } else await tx.siteBlock.create({ data: action.data as Prisma.SiteBlockCreateInput })
    }
    const rateRestored = restoreExchangeRate && plan.rateNeedsRestore
    if (rateRestored) await tx.exchangeRate.create({ data: { iskPerEur: REFERENCE_EUR_RATE, iskPerUsd: snapshot.rate?.iskPerUsd ?? 138, note: 'Reference catalogue EUR display rate restored by administrator. Existing booking snapshots retained.' } })
    return { changed: plan.actions.length, rateRestored, plan: planCatalogueRestore(await loadSnapshot(tx)) }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 })
}
