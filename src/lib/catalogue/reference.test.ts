import assert from 'node:assert/strict'
import test from 'node:test'
import { publishedListings } from '@/lib/booking/listings'
import { REFERENCE_EXTRAS, REFERENCE_ROUTES, REFERENCE_SERVICES, eurToIsk } from './reference'

test('every official price is the euro list converted at 150 ISK and sits on the right category', () => {
  const slugs = new Set(REFERENCE_SERVICES.map((service) => service.slug))
  assert.equal(REFERENCE_SERVICES.length, 11)
  assert.equal(REFERENCE_ROUTES.length, 28)
  for (const route of REFERENCE_ROUTES) {
    assert(slugs.has(route.serviceSlug))
    assert.equal(route.fromIsk % 150, 0)
    assert.equal(route.fromIsk, eurToIsk(route.fromIsk / 150))
  }
  const kind = (slug: string) => REFERENCE_SERVICES.find((service) => service.slug === slug)?.kind
  assert.equal(kind('airport-transfer'), 'AIRPORT')
  assert.equal(kind('city-transfer'), 'TAXI')
  assert.equal(kind('golden-circle'), 'TOUR')
  assert.equal(kind('blue-lagoon-transfer'), 'TAXI')
  assert.equal(kind('hvammsvik-transfer'), 'TAXI')
  assert.equal(kind('lava-tunnel-transfer'), 'TAXI')
  const airport = REFERENCE_ROUTES.filter((route) => route.serviceSlug === 'airport-transfer').map((route) => route.fromIsk).sort((a, b) => a - b)
  assert.deepEqual(airport, [24000, 30750])
  const golden = REFERENCE_ROUTES.filter((route) => route.serviceSlug === 'golden-circle').map((route) => route.fromIsk).sort((a, b) => a - b)
  assert.deepEqual(golden, [102000, 133500])
  assert.equal(REFERENCE_EXTRAS.every((extra) => extra.isk === 0), true)
})

test('a service that already has priced routes is not published a second time', () => {
  const services = REFERENCE_SERVICES.map((service) => ({
    id: service.slug,
    kind: service.kind,
    titleEn: service.titleEn,
    fromIsk: service.fromIsk,
    active: true,
    hoursLabel: service.hoursLabel ?? null,
    paxLabel: service.paxLabel ?? null,
    blurbEn: service.blurbEn ?? null,
  }))
  const routes = REFERENCE_ROUTES.map((route) => ({
    id: route.key,
    serviceId: route.serviceSlug,
    fromLabel: route.fromLabel,
    toLabel: route.toLabel,
    fromIsk: route.fromIsk,
    minutes: route.minutes,
    km: null,
    active: true,
    service: { id: route.serviceSlug, kind: services.find((service) => service.id === route.serviceSlug)?.kind || 'CUSTOM', titleEn: services.find((service) => service.id === route.serviceSlug)?.titleEn || '', active: true },
  }))
  const listings = publishedListings(routes, services)
  assert.equal(listings.length, 28)
  assert.equal(listings.every((listing) => listing.kind === 'route'), true)
  assert.equal(listings.filter((listing) => listing.category === 'airport').length, 2)
  assert.equal(listings.filter((listing) => listing.category === 'tour').length, 12)
  assert.equal(listings.filter((listing) => listing.category === 'taxi').length, 14)
})
