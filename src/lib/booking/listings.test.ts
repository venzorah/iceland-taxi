import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  UNAVAILABLE_MESSAGE,
  adminPriceIsk,
  matchListing,
  searchListings,
  publishedListings,
  shownAdminPrice,
  type CatalogueRoute,
  type CatalogueService,
} from './listings'

const airport: CatalogueService = {
  id: 'svc-airport',
  kind: 'AIRPORT',
  titleEn: 'Airport transfer',
  fromIsk: 14900,
  active: true,
}

const tour: CatalogueService = {
  id: 'svc-tour',
  kind: 'TOUR',
  titleEn: 'Golden Circle Private Tour',
  fromIsk: 89900,
  active: true,
  hoursLabel: '7–8 h',
}

const unpriced: CatalogueService = {
  id: 'svc-custom',
  kind: 'CUSTOM',
  titleEn: 'Custom day',
  fromIsk: null,
  active: true,
}

const kef: CatalogueRoute = {
  id: 'route-kef',
  serviceId: airport.id,
  fromLabel: 'Keflavík Airport (KEF)',
  toLabel: 'Reykjavík city centre',
  fromIsk: 22900,
  minutes: 45,
  km: 49,
  active: true,
  service: { id: airport.id, kind: 'AIRPORT', titleEn: airport.titleEn, active: true },
}

const freeRoute: CatalogueRoute = {
  id: 'route-free',
  serviceId: airport.id,
  fromLabel: 'Keflavík Airport (KEF)',
  toLabel: 'Hotel without a price',
  fromIsk: 0,
  minutes: 50,
  km: 60,
  active: true,
  service: { id: airport.id, kind: 'AIRPORT', titleEn: airport.titleEn, active: true },
}

describe('published listings', () => {
  const listings = publishedListings([kef, freeRoute], [airport, tour, unpriced])

  it('keeps priced routes and priced non-airport services', () => {
    assert.deepEqual(
      listings.map((listing) => listing.id),
      ['route-kef', 'svc-tour'],
    )
  })

  it('does not turn kilometres or a parent airport price into a fare', () => {
    const route = listings.find((listing) => listing.id === 'route-kef')
    assert.equal(route?.fromIsk, 22900)
    assert.equal(route?.km, 49)
    assert.equal(shownAdminPrice(route || null), 22900)
    assert.equal(adminPriceIsk(0), null)
    assert.equal(listings.some((listing) => listing.id === 'svc-airport'), false)
    assert.equal(listings.some((listing) => listing.id === 'route-free'), false)
  })

  it('keeps the listing price when pickup details change', () => {
    const route = listings.find((listing) => listing.id === 'route-kef') || null
    assert.equal(shownAdminPrice(route, 'Hotel Borg, Pósthússtræti 11'), 22900)
    assert.equal(shownAdminPrice(route, 'A completely different street'), shownAdminPrice(route, ''))
  })

  it('matches an explicit listing even when the pickup text is different', () => {
    const matched = matchListing(listings, {
      listingId: 'route-kef',
      listingKind: 'route',
      pickup: 'Somewhere else',
      destination: 'Not Reykjavík',
    })
    assert.equal(matched?.id, 'route-kef')
    assert.equal(shownAdminPrice(matched), 22900)
  })

  it('matches a route by its saved labels and a tour by its title', () => {
    assert.equal(
      matchListing(listings, {
        pickup: 'keflavík airport (kef)',
        destination: 'Reykjavík city centre',
      })?.id,
      'route-kef',
    )
    assert.equal(matchListing(listings, { destination: 'Golden Circle Private Tour' })?.id, 'svc-tour')
  })

  it('lists admin-priced options for a pickup and destination search', () => {
    const found = searchListings(listings, { pickup: 'Keflavik airport', destination: 'Reykjavik' })
    assert.deepEqual(found.map((listing) => listing.id), ['route-kef'])
    assert.equal(found[0]?.fromIsk, 22900)
    assert.equal(searchListings(listings, { pickup: 'Akureyri', destination: 'Vík' }).length, 0)
  })

  it('does not invent a listing for an unknown trip', () => {
    assert.equal(matchListing(listings, { pickup: 'Akureyri', destination: 'Vík' }), null)
    assert.equal(matchListing(listings, { listingId: 'missing' }), null)
    assert.equal(UNAVAILABLE_MESSAGE, 'This option is unavailable')
  })
})
