'use client'

import { useEffect, useState } from 'react'
import type { PublishedListing } from '@/lib/booking/listings'

export function usePublishedListings() {
  const [listings, setListings] = useState<PublishedListing[] | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/listings')
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return
        setListings(Array.isArray(data.listings) ? data.listings : [])
      })
      .catch(() => {
        if (alive) setListings([])
      })
    return () => {
      alive = false
    }
  }, [])

  return listings
}
