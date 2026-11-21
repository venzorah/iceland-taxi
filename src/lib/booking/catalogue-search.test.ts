import test from 'node:test'
import assert from 'node:assert/strict'
import { catalogueResults, catalogueOptions } from './catalogue-search'
import { publishedListings } from './listings'
const listings = publishedListings([
  { id: 'route', serviceId: 'airport', fromLabel: 'KEF', toLabel: 'Reykjavík', fromIsk: 22900, active: true, service: { id: 'airport', kind: 'AIRPORT', titleEn: 'Airport transfer', active: true } },
  { id: 'hidden', serviceId: null, fromLabel: 'Hidden', toLabel: 'Secret', fromIsk: 100, active: false },
], [{ id: 'tour', kind: 'TOUR', titleEn: 'Golden Circle', fromIsk: 89900, active: true }])
test('dropdowns only use published options in the selected category and pickup', () => {
  assert.deepEqual(catalogueOptions(listings, 'airport', 'KEF').destinations, ['Reykjavík'])
  assert.deepEqual(catalogueOptions(listings, 'tour', '').pickups, [])
  assert.equal(catalogueOptions(listings, 'airport', '').pickups.includes('Hidden'), false)
})
test('exact directional searches never fall back to unrelated or reverse routes', () => {
  assert.equal(catalogueResults(listings, { category: 'airport', pickup: 'KEF', destination: 'Reykjavik' }).length, 1)
  assert.equal(catalogueResults(listings, { category: 'airport', pickup: 'Reykjavík', destination: 'KEF' }).length, 0)
  assert.equal(catalogueResults(listings, { category: 'taxi', pickup: '', destination: '' }).length, 0)
  assert.equal(catalogueResults(listings, { category: 'airport', pickup: 'KEF', destination: 'Unknown' }).length, 0)
})
test('services are searched as offers and retain their own saved prices', () => {
  const result = catalogueResults(listings, { category: 'tour', pickup: '', destination: 'Golden Circle' })
  assert.equal(result[0].fromIsk, 89900)
  assert.equal(catalogueResults(listings, { category: 'tour', pickup: 'Invented', destination: 'Golden Circle' }).length, 0)
})
