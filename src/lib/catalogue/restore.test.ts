import assert from 'node:assert/strict'
import test from 'node:test'
import type { PrismaClient, Service, Route, SiteBlock, ExchangeRate } from '@prisma/client'
import { applyCatalogueRestore, planCatalogueRestore, previewCatalogueRestore } from './restore'
import { publishedListings } from '@/lib/booking/listings'
import { formatPrice } from '@/lib/design/data'

const date = new Date('2026-01-01T00:00:00Z')
function service(data: Partial<Service>): Service { return { id: 'saved-golden', slug: 'custom-golden-slug', kind: 'TAXI', titleEn: 'Golden Circle Private Tour', titleIs: null, blurbEn: null, blurbIs: null, imageUrl: null, hoursLabel: '7-8 h', paxLabel: 'Up to 8', fromIsk: 89900, active: true, sortOrder: 0, createdAt: date, updatedAt: date, ...data } }
function route(data: Partial<Route>): Route { return { id: 'custom-route', serviceId: null, fromLabel: 'Jabi', toLabel: 'Bwari', fromIsk: 2, minutes: null, km: null, imageUrl: null, active: true, returnTrip: false, override: true, createdAt: date, updatedAt: date, ...data } }
function fixture() {
  let state = {
    services: [service({}), service({ id: 'private-taxi', slug: 'private-taxi', titleEn: 'Private taxi', fromIsk: 8900 })],
    routes: [route({})],
    blocks: [{ key: 'home.airport.title', value: 'Keep our custom heading', updatedAt: date }] as SiteBlock[],
    rates: [{ id: 'old-rate', effective: date, iskPerEur: 1, iskPerUsd: 137, note: 'Keep historical rate' }] as ExchangeRate[],
    extras: [] as { id: string; key: string; labelEn: string; isk: number; active: boolean; sortOrder: number }[],
    vehicles: [{id:'vehicle-1',name:'Fixture car',upgradeIsk:5000}],
    bookings: [{ id: 'existing-booking', serviceId: 'saved-golden', amountSnapshot: 500, currency: 'EUR' }],
    payments: [{ id: 'existing-payment', amount: 500, currency: 'EUR' }],
  }
  let writes = 0, fail = false
  const models = {
    service: { findMany: async () => state.services, create: async ({ data }: { data: Partial<Service> }) => { writes++; const row = service(data); state.services.push(row); return row }, update: async ({ where, data }: { where: { id: string }; data: Partial<Service> }) => { writes++; return Object.assign(state.services.find(row => row.id === where.id)!, data) } },
    route: { findMany: async () => state.routes, create: async ({ data }: { data: Partial<Route> }) => { writes++; if (fail) throw Error('Fixture write failure'); const row = route(data); state.routes.push(row); return row }, update: async ({ where, data }: { where: { id: string }; data: Partial<Route> }) => { writes++; return Object.assign(state.routes.find(row => row.id === where.id)!, data) } },
    siteBlock: { findMany: async ({ where }: { where: { key: { in: string[] } } }) => state.blocks.filter(row => where.key.in.includes(row.key)), create: async ({ data }: { data: { key: string; value: string } }) => { assert.deepEqual(Object.keys(data).sort(), ['key', 'value']); writes++; state.blocks.push({ ...data, updatedAt: date }) } },
    exchangeRate: { findFirst: async () => state.rates.at(-1)!, create: async ({ data }: { data: Pick<ExchangeRate, 'iskPerEur' | 'iskPerUsd' | 'note'> }) => { writes++; state.rates.push({ id: 'new-rate', effective: new Date(), ...data }) } },
    vehicle: { findMany: async () => state.vehicles, update: async ({where,data}: {where:{id:string};data:{upgradeIsk:number}}) => { writes++; return Object.assign(state.vehicles.find(row => row.id === where.id)!,data) } },
    pricingExtra: {
      findMany: async () => state.extras,
      create: async ({ data }: { data: { key: string; labelEn: string; isk: number; active: boolean; sortOrder: number } }) => { writes++; const row = { id: data.key, ...data }; state.extras.push(row); return row },
      update: async ({ where, data }: { where: { key: string }; data: Partial<{ labelEn: string; isk: number; active: boolean; sortOrder: number }> }) => { writes++; return Object.assign(state.extras.find(row => row.key === where.key)!, data) },
    },
  }
  const db = { ...models, $transaction: async (run: (tx: unknown) => Promise<unknown>) => { const before = structuredClone(state); try { return await run(models) } catch (error) { state = before; throw error } } } as unknown as PrismaClient
  return { db, state: () => state, writes: () => writes, fail: () => { fail = true } }
}

test('preview is read-only and preserves custom data while identifying missing reference records', async () => {
  const f = fixture(), before = structuredClone(f.state()), plan = await previewCatalogueRestore(f.db)
  assert.equal(f.writes(), 0)
  assert.deepEqual(f.state(), before)
  assert.equal(plan.currentEurRate, 1)
  assert.equal(plan.referenceEurRate, 150)
  assert(plan.actions.some(action => action.id === 'saved-golden' && action.data.active === false))
  assert.equal(plan.actions.filter(action => action.model === 'service' && action.operation === 'create').length, 11)
  assert.equal(plan.actions.filter(action => action.model === 'route' && action.operation === 'create').length, 28)
  assert(!plan.actions.some(action => action.id === 'home.airport.title'))
})

test('apply restores bookable reference content and prices, preserves relationships and is idempotent', async () => {
  const f = fixture(), before = structuredClone(f.state()), plan = await previewCatalogueRestore(f.db)
  const applied = await applyCatalogueRestore(f.db, plan.fingerprint, true)
  assert(applied.rateRestored)
  const after = f.state()
  assert.equal(after.services.find(row => row.id === 'saved-golden')?.active, false)
  assert.equal(after.routes.find(row => row.id === 'custom-route')?.active, false)
  assert.deepEqual(after.bookings, before.bookings)
  assert.deepEqual(after.payments, before.payments)
  assert.deepEqual(after.rates[0], before.rates[0])
  assert.equal(after.rates.at(-1)?.iskPerEur, 150)
  assert.equal(after.rates.at(-1)?.iskPerUsd, 137)
  const listings = publishedListings(after.routes.map(row => ({ ...row, service: after.services.find(s => s.id === row.serviceId) || null })), after.services)
  const golden = listings.filter(row => row.title === 'Golden Circle').map(row => formatPrice(row.fromIsk, 'EUR', 150)).sort()
  assert.deepEqual(golden, ['€680', '€890'])
  const airport = listings.filter(row => row.category === 'airport')
  assert.equal(airport.length, 2)
  assert.deepEqual(airport.map(row => formatPrice(row.fromIsk, 'EUR', 150)).sort(), ['€160', '€205'])
  assert.equal(listings.some(row => row.title === 'Northern Lights Experience'), false)
  assert.equal(after.extras.find(row => row.key === 'meet-greet')?.isk, 0)
  assert.equal(after.extras.find(row => row.key === 'entrance-prebooked')?.active, true)
  assert.equal(applied.plan.actions.length, 0)
  const writes = f.writes()
  const repeated = await applyCatalogueRestore(f.db, applied.plan.fingerprint, true)
  assert.equal(repeated.changed, 0)
  assert.equal(repeated.rateRestored, false)
  assert.equal(f.writes(), writes)
})

test('a previous catalogue price is replaced and an already hidden custom service stays hidden', async () => {
  const f = fixture()
  Object.assign(f.state().services[0], { fromIsk: 120000, active: false, blurbEn: 'Our own description', imageUrl: '/photos/our-custom.jpg' })
  const plan = await previewCatalogueRestore(f.db)
  await applyCatalogueRestore(f.db, plan.fingerprint, false)
  const previous = f.state().services.find(row => row.id === 'saved-golden')
  assert.equal(previous?.fromIsk, 120000)
  assert.equal(previous?.active, false)
  assert.equal(previous?.blurbEn, 'Our own description')
  const official = f.state().services.find(row => row.slug === 'golden-circle')
  assert.equal(official?.fromIsk, 102000)
  assert.equal(official?.kind, 'TOUR')
  assert.equal(f.state().rates.length, 1)
  assert.equal(f.state().bookings[0].amountSnapshot, 500)
})

test('stale previews and ambiguous names reject without any writes; failures roll back the complete restore', async () => {
  const f = fixture(), plan = await previewCatalogueRestore(f.db)
  f.state().services[0].fromIsk = 100000
  await assert.rejects(applyCatalogueRestore(f.db, plan.fingerprint, true), error => (error as { code: string }).code === 'CATALOGUE_CHANGED')
  assert.equal(f.writes(), 0)
  f.state().services[0].titleEn = 'Golden Circle'
  f.state().services.push(service({ id: 'duplicate', slug: 'another-slug', titleEn: 'Golden Circle' }))
  const duplicate = await previewCatalogueRestore(f.db)
  assert(duplicate.conflicts.length)
  await assert.rejects(applyCatalogueRestore(f.db, duplicate.fingerprint, true), error => (error as { code: string }).code === 'CATALOGUE_CONFLICT')
  assert.equal(f.writes(), 0)
  const rollback = fixture(), before = structuredClone(rollback.state()), preview = await previewCatalogueRestore(rollback.db)
  rollback.fail()
  await assert.rejects(applyCatalogueRestore(rollback.db, preview.fingerprint, true))
  assert.deepEqual(rollback.state(), before)
})

test('fingerprint is stable across row order and detects content/rate changes', () => {
  const f = fixture(), state = f.state()
  const snapshot = { services: state.services, routes: state.routes, rate: state.rates[0], blocks: state.blocks }
  const plan = planCatalogueRestore(snapshot)
  assert.equal(planCatalogueRestore({ ...snapshot, services: [...snapshot.services].reverse() }).fingerprint, plan.fingerprint)
  assert.notEqual(planCatalogueRestore({ ...snapshot, rate: { ...snapshot.rate, iskPerEur: 150 } }).fingerprint, plan.fingerprint)
})

test('preview includes extras and vehicle changes, and concurrent pricing edits invalidate approval', async () => {
 const f=fixture(), plan=await previewCatalogueRestore(f.db)
 assert(plan.actions.some(action=>action.model==='vehicle' && action.changes.some(change=>change.before===5000 && change.after===0)))
 assert.equal(plan.actions.filter(action=>action.model==='pricingExtra').length,2)
 f.state().extras.push({id:'custom',key:'custom',labelEn:'Child seat',isk:2500,active:true,sortOrder:1})
 await assert.rejects(applyCatalogueRestore(f.db,plan.fingerprint,true),error=>(error as {code:string}).code==='CATALOGUE_CHANGED')
 assert.equal(f.writes(),0)
 const updated=await previewCatalogueRestore(f.db)
 assert(updated.actions.some(action=>action.id==='custom' && action.data.active===false))
 f.state().vehicles[0].upgradeIsk=6000
 await assert.rejects(applyCatalogueRestore(f.db,updated.fingerprint,true),error=>(error as {code:string}).code==='CATALOGUE_CHANGED')
 assert.equal(f.writes(),0)
})

test('publication marker failure rolls back catalogue and rate changes together', async () => {
 const f=fixture(), before=structuredClone(f.state()), plan=await previewCatalogueRestore(f.db)
 Object.assign(f.db.siteBlock,{upsert:async()=>{throw new Error('Fixture marker failure')}})
 await assert.rejects(applyCatalogueRestore(f.db,plan.fingerprint,true,{key:'catalogue.official-price-list',value:'fixture-version'}))
 assert.deepEqual(f.state(),before)
})
