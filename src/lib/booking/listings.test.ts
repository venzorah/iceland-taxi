import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  UNAVAILABLE_MESSAGE,
  adminPriceIsk,
  listingsForCustomers,
  matchListing,
  passengerChoices,
  passengersInChoice,
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

  it('keeps a saved photo on that price when the parent tour uses another photo', () => {
    const parent = { ...tour, imageUrl: '/photos/golden-circle.jpg' }
    const small: CatalogueRoute = {
      id: 'golden-small',
      serviceId: parent.id,
      fromLabel: 'Reykjavík',
      toLabel: 'Golden Circle · Car · 1–4 persons',
      fromIsk: 102000,
      active: true,
      imageUrl: '/photos/hero.jpg',
      service: { id: parent.id, kind: 'TOUR', titleEn: parent.titleEn, active: true },
    }
    const large: CatalogueRoute = { ...small, id: 'golden-large', toLabel: 'Golden Circle · Car · 5–8 persons', fromIsk: 133500, imageUrl: null }
    const cards = publishedListings([small, large], [parent])
    assert.equal(cards.find((card) => card.id === 'golden-small')?.imageUrl, '/photos/hero.jpg')
    assert.notEqual(cards.find((card) => card.id === 'golden-large')?.imageUrl, cards.find((card) => card.id === 'golden-small')?.imageUrl)
  })

  it('does not reuse one tour photo for two prices of the same place', () => {
    const parent = { ...tour, imageUrl: '/photos/golden-circle.jpg' }
    const shared = { serviceId: parent.id, fromLabel: 'Reykjavík', fromIsk: 102000, active: true, imageUrl: null, service: { id: parent.id, kind: 'TOUR', titleEn: parent.titleEn, active: true } }
    const cards = publishedListings([
      { ...shared, id: 'price-a', toLabel: 'Same place · 1–4 persons' },
      { ...shared, id: 'price-b', toLabel: 'Same place · 5–8 persons', fromIsk: 133500 },
    ], [parent])
    assert.notEqual(cards[0]?.imageUrl, cards[1]?.imageUrl)
    assert.equal(cards.some((card) => card.imageUrl === parent.imageUrl), false)
  })

  it('shows one place with a choice of passenger prices', () => {
    const parent = { ...tour, id: 'golden', imageUrl: '/photos/golden-circle.jpg' }
    const service = { id: parent.id, kind: 'TOUR', titleEn: 'Golden Circle', active: true }
    const cards = publishedListings([
      { id: 'small', serviceId: parent.id, fromLabel: 'Reykjavík', toLabel: 'Golden Circle · Car · 1–4 persons', fromIsk: 102000, minutes: 360, active: true, service },
      { id: 'large', serviceId: parent.id, fromLabel: 'Reykjavík', toLabel: 'Golden Circle · Car · 5–8 persons', fromIsk: 133500, minutes: 360, active: true, service },
      { id: 'return-small', serviceId: 'lagoon', fromLabel: 'Reykjavík', toLabel: 'Blue Lagoon · return · Car · 1–4 persons', fromIsk: 49500, minutes: 240, active: true, service: { id: 'lagoon', kind: 'TAXI', titleEn: 'Blue Lagoon', active: true } },
      { id: 'return-large', serviceId: 'lagoon', fromLabel: 'Reykjavík', toLabel: 'Blue Lagoon · return · Car · 5–8 persons', fromIsk: 61500, minutes: 240, active: true, service: { id: 'lagoon', kind: 'TAXI', titleEn: 'Blue Lagoon', active: true } },
      { id: 'one-way', serviceId: 'lagoon', fromLabel: 'Reykjavík', toLabel: 'Blue Lagoon · one way · Car · 1–4 persons', fromIsk: 24000, minutes: null, active: true, service: { id: 'lagoon', kind: 'TAXI', titleEn: 'Blue Lagoon', active: true } },
    ], [parent])
    const shown = listingsForCustomers(cards)
    assert.deepEqual(shown.map((card) => card.id), ['small', 'return-small', 'one-way'])
    const choices = passengerChoices(cards, shown[0])
    assert.deepEqual(choices.map((choice) => [choice.label, choice.fromIsk]), [['1–4 persons', 102000], ['5–8 persons', 133500]])
    assert.equal(passengerChoices(cards, cards.find((card) => card.id === 'one-way')!).length, 0)
    assert.equal(passengersInChoice('5–8 persons', 2), 5)
    assert.equal(passengersInChoice('1–4 persons', 3), 3)
  })

  it('does not invent a listing for an unknown trip', () => {
    assert.equal(matchListing(listings, { pickup: 'Akureyri', destination: 'Vík' }), null)
    assert.equal(matchListing(listings, { listingId: 'missing' }), null)
    assert.equal(UNAVAILABLE_MESSAGE, 'This option is unavailable')
  })
})
