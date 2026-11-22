import assert from 'node:assert/strict'
import test from 'node:test'
import { createCatalogueStore } from './catalogue-store'
import type { PublishedListing } from './listings'
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
test('two subscribers share a request; one unmount cannot cancel it; fresh navigation reuses it', async () => {
  let resolve!: (v: PublishedListing[]) => void, calls = 0, now = 0
  const store = createCatalogueStore(() => { calls++; return new Promise(r => { resolve = r }) }, () => now)
  const off = store.subscribe(() => {}); store.subscribe(() => {})
  const a = store.refresh(), b = store.refresh(); await flush(); off(); assert.equal(calls, 1)
  resolve([]); await Promise.all([a,b]); await store.refresh(); assert.equal(calls, 1)
  now = 15001; const c = store.refresh(); await flush(); assert.equal(calls, 2); resolve([]); await c
})
test('publication/price invalidation discards in-flight stale results and refreshes active readers', async () => {
  const resolvers: ((v: PublishedListing[]) => void)[] = []
  const store = createCatalogueStore(() => new Promise(r => resolvers.push(r)))
  store.subscribe(() => {}); const first = store.refresh(); await flush(); void store.invalidate()
  resolvers[0]([{ id: 'unpublished-old-price' } as PublishedListing]); await first; await flush()
  assert.equal(store.getSnapshot().listings, null)
  resolvers[1]([]); await flush(); assert.deepEqual(store.getSnapshot().listings, [])
})
test('errors clear stale selections and shared retry recovers without duplicate requests', async () => {
  let calls = 0
  const store = createCatalogueStore(async () => { if (++calls === 1) throw Error('private error'); return [] })
  store.subscribe(() => {})
  await store.refresh(); assert(store.getSnapshot().error); assert.deepEqual(store.getSnapshot().listings, [])
  await Promise.all([store.invalidate(),store.refresh(true)]); assert.equal(calls, 2); assert.equal(store.getSnapshot().error, '')
})
test('edits while no screen is mounted invalidate prices without a background request', async () => {
  let price=100, calls=0
  const store=createCatalogueStore(async()=>{calls++;return [{id:'fixture',fromIsk:price} as PublishedListing]})
  const off=store.subscribe(()=>{});await store.refresh();off();price=200
  await store.invalidate();assert.equal(calls,1);assert.equal(store.getSnapshot().listings,null)
  store.subscribe(()=>{});await store.refresh();assert.equal(store.getSnapshot().listings?.[0].fromIsk,200);assert.equal(calls,2)
})
