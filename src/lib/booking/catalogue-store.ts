import type { PublishedListing } from './listings'
export const CATALOGUE_FRESH_MS = 15_000
export type CatalogueState = { listings: PublishedListing[] | null; error: string }
/** Memory-only public cache. Requests belong to the store, never to a single subscriber. */
export function createCatalogueStore(load: () => Promise<PublishedListing[]>, now = Date.now) {
  let state: CatalogueState = { listings: null, error: '' }, loadedAt = -Infinity
  let pending: Promise<void> | null = null, generation = 0
  const listeners = new Set<() => void>()
  const publish = (next: CatalogueState) => { state = next; listeners.forEach(listener => listener()) }
  const refresh = (force = false): Promise<void> => {
    if (pending) return pending
    if (!force && now() - loadedAt < CATALOGUE_FRESH_MS) return Promise.resolve()
    const started = generation
    pending = Promise.resolve().then(load).then(listings => {
      if (generation === started) { loadedAt = now(); publish({ listings, error: '' }) }
    }).catch(() => {
      if (generation === started) { loadedAt = -Infinity; publish({ listings: [], error: 'Published prices are temporarily unavailable. Please retry, or contact our team about your journey.' }) }
    }).finally(() => {
      pending = null
      if (generation !== started && listeners.size) void refresh(true)
    })
    return pending
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    refresh,
    invalidate() { generation++; loadedAt = -Infinity; publish({ listings: null, error: '' }); return listeners.size ? refresh(true) : Promise.resolve() },
  }
}
