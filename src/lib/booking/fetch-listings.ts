import type { PublishedListing } from './listings'
export async function fetchPublishedListings(signal?: AbortSignal, transport: typeof fetch = fetch): Promise<PublishedListing[]> {
  const response = await transport('/api/listings', { signal, cache: 'no-store' })
  if (!response.ok) throw new Error('LISTINGS_UNAVAILABLE')
  const data = await response.json().catch(() => null)
  if (!data?.ok || !Array.isArray(data.listings)) throw new Error('LISTINGS_UNAVAILABLE')
  return data.listings
}
