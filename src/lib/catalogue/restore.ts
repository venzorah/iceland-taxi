import { createHash } from 'node:crypto'
import { Prisma, type PrismaClient, type Service, type Route, type ExchangeRate, type SiteBlock, type PricingExtra, type Vehicle } from '@prisma/client'
import { SITE_BLOCKS } from '@/lib/content/blocks'
import { HttpError } from '@/lib/security/http'
import { REFERENCE_SERVICES, REFERENCE_ROUTES, REFERENCE_EXTRAS, REFERENCE_EUR_RATE } from './reference'

type Snapshot = { services: Service[]; routes: Route[]; rate: ExchangeRate | null; blocks: SiteBlock[]; extras?: PricingExtra[]; vehicles?: Pick<Vehicle, 'id' | 'name' | 'upgradeIsk'>[] }
type Change = { field: string; before: unknown; after: unknown }
type Action = { model: 'service' | 'route' | 'siteBlock' | 'pricingExtra' | 'vehicle'; operation: 'create' | 'update'; id: string; label: string; data: Record<string, unknown>; changes: Change[] }
export type CatalogueRestorePlan = { fingerprint: string; actions: Action[]; warnings: string[]; conflicts: string[]; currentEurRate: number | null; referenceEurRate: number; rateNeedsRestore: boolean }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
const contentKeys = new Set(['home.airport.kicker', 'home.airport.title', 'home.airport.body', 'home.tours.title', 'home.tours.body', 'image.airport', 'image.goldenCircle', 'image.southCoast', 'image.northernLights', 'image.privateDriver', ...SITE_BLOCKS.filter(block => /^(airport|tours|driver)\./.test(block.key)).map(block => block.key)])
const referenceBlocks = SITE_BLOCKS.filter(block => contentKeys.has(block.key))

/** Install the official price list. Matched rows are updated. Anything else is paused, not deleted, so booking history stays. */
export function planCatalogueRestore(snapshot: Snapshot): CatalogueRestorePlan {
  const actions: Action[] = [], warnings: string[] = [], conflicts: string[] = []
  const serviceIds = new Map<string, string>()
  const keptServiceIds = new Set<string>()
  for (const reference of REFERENCE_SERVICES) {
    const matches = snapshot.services.filter(row => row.slug === reference.slug || normalize(row.titleEn) === normalize(reference.titleEn))
    if (matches.length > 1) { conflicts.push(`Resolve duplicate or conflicting service: ${reference.titleEn}.`); continue }
    const existing = matches[0], id = existing?.id || `reference-${reference.slug}`
    serviceIds.set(reference.slug, id)
    keptServiceIds.add(id)
    if (!existing) {
      if (snapshot.services.some(row => row.id === id)) { conflicts.push(`The restore ID for ${reference.titleEn} is already used.`); continue }
      const data = { ...reference, active: true }
      actions.push({ model: 'service', operation: 'create', id, label: reference.titleEn, data, changes: Object.entries(data).map(([field, after]) => ({ field, before: null, after })) })
      continue
    }
    const data: Record<string, unknown> = {}
    if (existing.kind !== reference.kind) data.kind = reference.kind
    if (existing.fromIsk !== reference.fromIsk) data.fromIsk = reference.fromIsk
    if (existing.titleEn !== reference.titleEn) data.titleEn = reference.titleEn
    if (existing.slug !== reference.slug) data.slug = reference.slug
    if (existing.sortOrder !== reference.sortOrder) data.sortOrder = reference.sortOrder
    for (const field of ['blurbEn', 'imageUrl', 'hoursLabel', 'paxLabel'] as const) {
      const next = reference[field]
      if (next !== undefined && existing[field] !== next) data[field] = next
    }
    if (!existing.active) data.active = true
    if (Object.keys(data).length) actions.push({ model: 'service', operation: 'update', id, label: reference.titleEn, data, changes: Object.entries(data).map(([field, after]) => ({ field, before: existing[field as keyof Service], after })) })
  }
  for (const row of snapshot.services) {
    if (keptServiceIds.has(row.id) || !row.active) continue
    actions.push({ model: 'service', operation: 'update', id: row.id, label: row.titleEn, data: { active: false }, changes: [{ field: 'active', before: true, after: false }] })
    warnings.push(`${row.titleEn} is not on the official list and will be hidden. You can edit or delete it in Services.`)
  }
  const keptRouteIds = new Set<string>()
  for (const reference of REFERENCE_ROUTES) {
    const matches = snapshot.routes.filter(row => normalize(row.fromLabel) === normalize(reference.fromLabel) && normalize(row.toLabel) === normalize(reference.toLabel))
    const label = `${reference.fromLabel} → ${reference.toLabel}`
    if (matches.length > 1) { conflicts.push(`Resolve duplicate route: ${label}.`); continue }
    const serviceId = serviceIds.get(reference.serviceSlug)
    if (!serviceId) continue
    const existing = matches[0], id = existing?.id || `reference-${reference.key}`
    keptRouteIds.add(id)
    const fields = { fromLabel: reference.fromLabel, toLabel: reference.toLabel, minutes: reference.minutes, fromIsk: reference.fromIsk, returnTrip: reference.returnTrip, serviceId, active: true }
    if (!existing) {
      if (snapshot.routes.some(row => row.id === id)) { conflicts.push(`The restore ID for ${label} is already used.`); continue }
      actions.push({ model: 'route', operation: 'create', id, label, data: fields, changes: Object.entries(fields).map(([field, after]) => ({ field, before: null, after })) })
    } else {
      const data: Record<string, unknown> = {}
      if (existing.serviceId !== serviceId) data.serviceId = serviceId
      if (existing.minutes !== reference.minutes) data.minutes = reference.minutes
      if (existing.fromIsk !== reference.fromIsk) data.fromIsk = reference.fromIsk
      if (existing.returnTrip !== reference.returnTrip) data.returnTrip = reference.returnTrip
      if (!existing.active) data.active = true
      if (Object.keys(data).length) actions.push({ model: 'route', operation: 'update', id, label, data, changes: Object.entries(data).map(([field, after]) => ({ field, before: existing[field as keyof Route], after })) })
    }
  }
  for (const row of snapshot.routes) {
    if (keptRouteIds.has(row.id) || !row.active) continue
    const label = `${row.fromLabel} → ${row.toLabel}`
    actions.push({ model: 'route', operation: 'update', id: row.id, label, data: { active: false }, changes: [{ field: 'active', before: true, after: false }] })
    warnings.push(`${label} is not on the official list and will be paused. You can edit or delete it in Routes.`)
  }
  for (const reference of referenceBlocks) {
    if (snapshot.blocks.some(row => row.key === reference.key)) continue
    const data = { key: reference.key, value: reference.value }
    actions.push({ model: 'siteBlock', operation: 'create', id: reference.key, label: reference.label, data, changes: [{ field: 'value', before: null, after: reference.value }] })
  }
  const extras = snapshot.extras || []
  for (const reference of REFERENCE_EXTRAS) {
    const existing = extras.find(row => row.key === reference.key)
    const data = Object.fromEntries(Object.entries(reference).filter(([field, value]) => !existing || existing[field as keyof PricingExtra] !== value))
    if (Object.keys(data).length) actions.push({ model: 'pricingExtra', operation: existing ? 'update' : 'create', id: reference.key, label: reference.labelEn, data, changes: Object.entries(data).map(([field, after]) => ({ field, before: existing?.[field as keyof PricingExtra] ?? null, after })) })
  }
  const officialKeys = new Set<string>(REFERENCE_EXTRAS.map(extra => extra.key))
  for (const row of extras) {
    if (row.active && !officialKeys.has(row.key)) actions.push({ model: 'pricingExtra', operation: 'update', id: row.key, label: row.labelEn, data: { active: false }, changes: [{ field: 'active', before: true, after: false }] })
  }
  for (const row of snapshot.vehicles || []) {
    if (row.upgradeIsk !== 0) actions.push({ model: 'vehicle', operation: 'update', id: row.id, label: row.name, data: { upgradeIsk: 0 }, changes: [{ field: 'upgradeIsk', before: row.upgradeIsk, after: 0 }] })
  }
  // Sorting makes stale-preview checks independent of the database's row-return order.
  const fingerprint = createHash('sha256').update(JSON.stringify({ reference: { services: REFERENCE_SERVICES, routes: REFERENCE_ROUTES, extras: REFERENCE_EXTRAS, blocks: referenceBlocks, eur: REFERENCE_EUR_RATE }, services: [...snapshot.services].sort((a, b) => a.id.localeCompare(b.id)), routes: [...snapshot.routes].sort((a, b) => a.id.localeCompare(b.id)), blocks: [...snapshot.blocks].sort((a, b) => a.key.localeCompare(b.key)), extras: [...extras].sort((a, b) => a.key.localeCompare(b.key)), vehicles: [...(snapshot.vehicles || [])].sort((a, b) => a.id.localeCompare(b.id)), rate: snapshot.rate })).digest('hex')
  return { fingerprint, actions, warnings, conflicts, currentEurRate: snapshot.rate?.iskPerEur ?? null, referenceEurRate: REFERENCE_EUR_RATE, rateNeedsRestore: snapshot.rate?.iskPerEur !== REFERENCE_EUR_RATE }
}

async function loadSnapshot(db: Prisma.TransactionClient | PrismaClient): Promise<Snapshot> {
  const [services, routes, rate, blocks, extras, vehicles] = await Promise.all([db.service.findMany(), db.route.findMany(), db.exchangeRate.findFirst({ orderBy: { effective: 'desc' } }), db.siteBlock.findMany({ where: { key: { in: [...contentKeys] } } }), db.pricingExtra.findMany(), db.vehicle.findMany({ select: { id: true, name: true, upgradeIsk: true } })])
  return { services, routes, rate, blocks, extras, vehicles }
}
export async function previewCatalogueRestore(db: PrismaClient) { return planCatalogueRestore(await loadSnapshot(db)) }

/** Replaces catalogue prices with the official list. Booking and payment snapshots are not rewritten. */
export async function applyCatalogueRestore(db: PrismaClient, fingerprint: string, restoreExchangeRate: boolean, publication?: { key: string; value: string }) {
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
      } else if (action.model === 'pricingExtra') {
        if (action.operation === 'create') await tx.pricingExtra.create({ data: action.data as Prisma.PricingExtraCreateInput })
        else await tx.pricingExtra.update({ where: { key: action.id }, data: action.data })
      } else if (action.model === 'vehicle') await tx.vehicle.update({ where: { id: action.id }, data: action.data })
      else await tx.siteBlock.create({ data: action.data as Prisma.SiteBlockCreateInput })
    }
    const rateRestored = restoreExchangeRate && plan.rateNeedsRestore
    if (rateRestored) await tx.exchangeRate.create({ data: { iskPerEur: REFERENCE_EUR_RATE, iskPerUsd: snapshot.rate?.iskPerUsd ?? 138, note: 'Reference catalogue EUR display rate restored by administrator. Existing booking snapshots retained.' } })
    if (publication) await tx.siteBlock.upsert({ where: { key: publication.key }, create: publication, update: { value: publication.value } })
    return { changed: plan.actions.length, rateRestored, plan: planCatalogueRestore(await loadSnapshot(tx)) }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 })
}
