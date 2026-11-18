'use client'
import { useCallback, useEffect, useState } from 'react'
import type { PublishedListing } from '@/lib/booking/listings'
import { fetchPublishedListings } from '@/lib/booking/fetch-listings'

/** A catalogue outage must not replace the entire public page with an error boundary. */
export function usePublishedListings() {
  const [listings, setListings] = useState<PublishedListing[] | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => { setListings(null); setError(''); setAttempt(value => value + 1) }, [])
  useEffect(() => {
    const controller = new AbortController()
    fetchPublishedListings(AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
      .then(data => { if (!controller.signal.aborted) { setListings(data); setError('') } })
      .catch(() => { if (!controller.signal.aborted) { setListings([]); setError('Published prices are temporarily unavailable. Please retry, or contact our team about your journey.') } })
    return () => controller.abort()
  }, [attempt])
  return { listings, error, retry }
}
