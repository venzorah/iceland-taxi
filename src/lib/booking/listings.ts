export const UNAVAILABLE_MESSAGE = 'This option is unavailable'

export type ListingKind = 'route' | 'service'
export type ListingCategory = 'airport' | 'taxi' | 'tour' | 'driver' | 'custom'

export type PublishedListing = {
  id: string
  kind: ListingKind
  serviceId: string | null
  routeId: string | null
  title: string
  fromLabel: string
  toLabel: string
  fromIsk: number
  minutes: number | null
  km: number | null
  category: ListingCategory
  hoursLabel: string | null
  paxLabel: string | null
  blurb: string | null
  imageUrl: string | null
}

export type CatalogueService = {
  id: string
  kind: string
  titleEn: string
  fromIsk: number | null
  active: boolean
  hoursLabel?: string | null
  paxLabel?: string | null
  blurbEn?: string | null
  imageUrl?: string | null
}

export type CatalogueRoute = {
  id: string
  serviceId: string | null
  fromLabel: string
  toLabel: string
  fromIsk: number | null
  minutes?: number | null
  km?: number | null
  active: boolean
  service?: { id: string; kind: string; titleEn: string; active: boolean } | null
}

export type ListingQuery = {
  listingId?: string | null
  listingKind?: string | null
  routeId?: string | null
  serviceId?: string | null
  pickup?: string | null
  destination?: string | null
}

export function normalizePlace(value: string | null | undefined) {
  return (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

/** A stored admin price. Zero, blank, and non-numbers are not a price. */
export function adminPriceIsk(fromIsk: number | null | undefined): number | null {
  if (typeof fromIsk !== 'number' || !Number.isFinite(fromIsk)) return null
  const rounded = Math.round(fromIsk)
  if (rounded <= 0) return null
  return rounded
}

function categoryFor(kind: string | null | undefined): ListingCategory {
  switch (kind) {
    case 'AIRPORT':
      return 'airport'
    case 'TAXI':
      return 'taxi'
    case 'TOUR':
      return 'tour'
    case 'DRIVER':
      return 'driver'
    default:
      return 'custom'
  }
}

/**
 * Published bookable options. A route uses its own saved ISK price.
 * An airport service is not a second price on top of its routes.
 * Kilometres are kept for display and are never a fare.
 */
export function publishedListings(routes: CatalogueRoute[], services: CatalogueService[]): PublishedListing[] {
  const listings: PublishedListing[] = []
  for (const route of routes) {
    if (!route.active) continue
    if (route.service && route.service.active === false) continue
    const price = adminPriceIsk(route.fromIsk)
    if (price == null) continue
    listings.push({
      id: route.id,
      kind: 'route',
      serviceId: route.serviceId,
      routeId: route.id,
      title: route.service?.titleEn || 'Transfer',
      fromLabel: route.fromLabel,
      toLabel: route.toLabel,
      fromIsk: price,
      minutes: route.minutes ?? null,
      km: route.km ?? null,
      category: categoryFor(route.service?.kind),
      hoursLabel: route.minutes ? `${route.minutes} min` : null,
      paxLabel: null,
      blurb: null,
      imageUrl: null,
    })
  }
  for (const service of services) {
    if (!service.active) continue
    if (service.kind === 'AIRPORT') continue
    const price = adminPriceIsk(service.fromIsk)
    if (price == null) continue
    listings.push({
      id: service.id,
      kind: 'service',
      serviceId: service.id,
      routeId: null,
      title: service.titleEn,
      fromLabel: service.titleEn,
      toLabel: service.titleEn,
      fromIsk: price,
      minutes: null,
      km: null,
      category: categoryFor(service.kind),
      hoursLabel: service.hoursLabel ?? null,
      paxLabel: service.paxLabel ?? null,
      blurb: service.blurbEn ?? null,
      imageUrl: service.imageUrl ?? null,
    })
  }
  return listings
}

export function listingLabel(listing: PublishedListing) {
  if (listing.kind === 'route') return `${listing.fromLabel} → ${listing.toLabel}`
  return listing.title
}

/**
 * Match a customer selection to one published listing.
 * An explicit listing id wins. A different pickup string does not select another price.
 */
export function matchListing(listings: PublishedListing[], query: ListingQuery): PublishedListing | null {
  const listingId = query.listingId?.trim()
  if (listingId) {
    const kind = query.listingKind?.trim()
    return listings.find((listing) => listing.id === listingId && (!kind || listing.kind === kind)) ?? null
  }
  const routeId = query.routeId?.trim()
  if (routeId) return listings.find((listing) => listing.kind === 'route' && listing.id === routeId) ?? null
  const serviceId = query.serviceId?.trim()
  if (serviceId) return listings.find((listing) => listing.kind === 'service' && listing.id === serviceId) ?? null

  const pickup = normalizePlace(query.pickup)
  const destination = normalizePlace(query.destination)
  if (pickup && destination) {
    const route = listings.find(
      (listing) =>
        listing.kind === 'route' &&
        normalizePlace(listing.fromLabel) === pickup &&
        normalizePlace(listing.toLabel) === destination,
    )
    if (route) return route
    return (
      listings.find(
        (listing) =>
          listing.kind === 'service' &&
          (normalizePlace(listing.title) === destination || normalizePlace(listing.title) === pickup),
      ) ?? null
    )
  }
  if (destination) {
    return listings.find((listing) => listing.kind === 'service' && normalizePlace(listing.title) === destination) ?? null
  }
  return null
}

function placeMatches(query: string | null | undefined, label: string) {
  const q = normalizePlace(query)
  const l = normalizePlace(label)
  if (!q || !l) return false
  if (q === l) return true
  const queryWords = q.split(' ').filter((word) => word.length >= 3)
  const labelWords = l.split(' ').map((word) => word.replace(/[()]/g, ''))
  if (queryWords.length === 0) return false
  return queryWords.every((word) => labelWords.some((labelWord) => labelWord === word || labelWord.startsWith(word)))
}

/**
 * Published options for a pickup and destination search.
 * The fare stays the admin ISK price. Kilometres are never used to price a result.
 */
export function searchListings(
  listings: PublishedListing[],
  query: { pickup?: string | null; destination?: string | null; category?: string | null },
): PublishedListing[] {
  const pickup = query.pickup?.trim() || ''
  const destination = query.destination?.trim() || ''
  const category = query.category?.trim()
  const scoped = category ? listings.filter((listing) => listing.category === category) : listings
  const pool = scoped.length > 0 ? scoped : listings
  if (!pickup && !destination) return pool

  const matches = (listing: PublishedListing) => {
    if (listing.kind === 'route') {
      const forward = placeMatches(pickup, listing.fromLabel) && placeMatches(destination, listing.toLabel)
      const reverse = placeMatches(pickup, listing.toLabel) && placeMatches(destination, listing.fromLabel)
      return forward || reverse
    }
    return placeMatches(destination, listing.title) || placeMatches(pickup, listing.title)
  }
  const both = pool.filter(matches)
  if (both.length > 0) return both

  return pool.filter((listing) => {
    if (listing.kind === 'route') {
      return (
        placeMatches(pickup, listing.fromLabel) ||
        placeMatches(destination, listing.toLabel) ||
        placeMatches(pickup, listing.toLabel) ||
        placeMatches(destination, listing.fromLabel)
      )
    }
    return placeMatches(destination, listing.title) || placeMatches(pickup, listing.title)
  })
}

/** Price shown for a listing. Pickup details are accepted and ignored. */
export function shownAdminPrice(listing: PublishedListing | null, _pickupDetails?: string): number | null {
  if (!listing) return null
  return adminPriceIsk(listing.fromIsk)
}
