'use client'
import { useEffect, useSyncExternalStore } from 'react'
import { fetchPublishedListings } from '@/lib/booking/fetch-listings'
import { createCatalogueStore, type CatalogueState } from '@/lib/booking/catalogue-store'
const store = createCatalogueStore(() => fetchPublishedListings(AbortSignal.timeout(15000)))
const serverSnapshot: CatalogueState = { listings: null, error: '' }
let users = 0, connected = false, interval: ReturnType<typeof setInterval> | undefined
function connect() {
  // One set of listeners for this browser window, retained through client navigation.
  // A publication edit must invalidate cached data even while no catalogue screen is mounted.
  if (!connected) {
    connected = true
    const refresh = () => { if (users && !document.hidden) void store.refresh() }
    const invalidate = () => { void store.invalidate() }
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('itb-catalogue') : null
    if (channel) channel.onmessage = invalidate
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('itb-catalogue-updated', invalidate)
  }
  if (++users === 1) interval = setInterval(() => { if (!document.hidden) void store.refresh() }, 30000)
  return () => { if (--users === 0) clearInterval(interval) }
}
/** Quotes/availability remain uncached and authoritative. Public selections revalidate after 15s. */
export function usePublishedListings() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, () => serverSnapshot)
  useEffect(() => { const disconnect = connect(); void store.refresh(); return disconnect }, [])
  return { ...state, retry: () => { void store.invalidate() } }
}
