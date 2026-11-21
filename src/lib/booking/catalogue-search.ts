import { normalizePlace, type PublishedListing } from './listings'

export type CatalogueQuery = { category: string; pickup: string; destination: string }
/** Exact published selections only; never broaden a failed search to another category or route. */
export function catalogueResults(listings: PublishedListing[], query: CatalogueQuery) {
  return listings.filter(item => item.category === query.category && (item.kind === 'service'
    ? (!query.destination || normalizePlace(query.destination) === normalizePlace(item.title)) && !query.pickup
    : (!query.pickup || normalizePlace(query.pickup) === normalizePlace(item.fromLabel)) && (!query.destination || normalizePlace(query.destination) === normalizePlace(item.toLabel))))
}
export function catalogueOptions(listings: PublishedListing[], category: string, pickup: string) {
  const scoped = listings.filter(item => item.category === category)
  const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b))
  return {
    pickups: unique(scoped.filter(item => item.kind === 'route').map(item => item.fromLabel)),
    destinations: unique(scoped.filter(item => item.kind === 'route' && (!pickup || item.fromLabel === pickup)).map(item => item.toLabel)),
    services: scoped.filter(item => item.kind === 'service'),
  }
}
