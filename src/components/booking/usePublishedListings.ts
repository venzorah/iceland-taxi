'use client'
import { useEffect, useState } from 'react'
import type { PublishedListing } from '@/lib/booking/listings'
export function usePublishedListings() {
  const [listings, setListings] = useState<PublishedListing[] | null>(null)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/listings', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const data = await response.json()
      if (!response.ok || !data.ok || !Array.isArray(data.listings)) throw new Error('Published trips are temporarily unavailable. Please try again.')
      if (!controller.signal.aborted) setListings(data.listings)
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error : new Error('Could not load trips.')) })
    return () => controller.abort()
  }, [])
  if (error) throw error
  return listings
}
