import { IMG, LOGO_DARK, LOGO_LIGHT, FAQS } from '@/lib/design/data'

export type SiteBlockKind = 'image' | 'text'

export type SiteBlockDef = {
  key: string
  kind: SiteBlockKind
  group: string
  label: string
  value: string
}

const images: SiteBlockDef[] = [
  ['image.hero', 'Homepage hero', IMG.hero],
  ['image.airport', 'Airport transfer', IMG.airport],
  ['image.goldenCircle', 'Golden Circle', IMG.goldenCircle],
  ['image.northernLights', 'Northern lights', IMG.northernLights],
  ['image.southCoast', 'South Coast', IMG.southCoast],
  ['image.privateDriver', 'Private driver', IMG.privateDriver],
  ['image.fleet', 'Fleet', IMG.fleet],
  ['image.reykjavik', 'Reykjavík', IMG.reykjavik],
  ['image.glacierLagoon', 'Glacier lagoon', IMG.glacierLagoon],
  ['image.blueLagoon', 'Blue Lagoon', IMG.blueLagoon],
  ['image.logoLight', 'Logo on a light background', LOGO_LIGHT],
  ['image.logoDark', 'Logo on a dark background', LOGO_DARK],
].map(([key, label, value]) => ({ key, kind: 'image' as const, group: 'Images', label, value }))

const texts: SiteBlockDef[] = [
  ['home.hero.title', 'Hero title', 'Discover Iceland. Travel Comfortably.'],
  ['home.hero.body', 'Hero introduction', 'From airport transfers to private tours and personalised vacation drivers, enjoy convenient transportation across Iceland with a booking experience designed around you.'],
  ['home.airport.kicker', 'Airport label', 'Keflavík International Airport'],
  ['home.airport.title', 'Airport heading', 'Airport transfers, met at arrivals'],
  ['home.airport.body', 'Airport description', 'Private transfers between KEF, Reykjavík, the Blue Lagoon and hotels across the southwest. Add your flight number and your driver follows your arrival time.'],
  ['home.tours.title', 'Tours heading', 'Private sightseeing tours'],
  ['home.tours.body', 'Tours description', 'Your own vehicle and driver, your own schedule. Stop where you want, stay as long as you like.'],
  ['airport.hero.title', 'Airport page heading', 'Private airport transfers with flight tracking'],
  ['airport.hero.body', 'Airport page introduction', 'Fixed-price private rides between KEF, Reykjavík, Blue Lagoon and southwest hotels. Add your flight number and your driver follows the arrival.'],
  ['airport.meet.title', 'Meet at arrivals heading', 'Meet at arrivals'],
  ['airport.meet.body', 'Meet at arrivals description', 'Name sign and included waiting time shown before you pay.'],
  ['airport.vehicle.title', 'Private vehicle heading', 'Private vehicle'],
  ['airport.vehicle.body', 'Private vehicle description', 'Your party only, choose sedan, SUV, minivan or minibus.'],
  ['airport.flight.title', 'Flight tracking heading', 'Flight-aware'],
  ['airport.flight.body', 'Flight tracking description', 'Delays update the pickup window when a flight number is provided.'],
  ['tours.hero.title', 'Tours page heading', 'Private sightseeing tours across Iceland'],
  ['tours.hero.body', 'Tours page introduction', 'Your own vehicle and driver, your own schedule. Stop where you want, packages are starting points, not fixed bus itineraries.'],
  ['driver.hero.title', 'Private driver page heading', 'Private driver & chauffeur hire in Iceland'],
  ['driver.hero.body', 'Private driver introduction', 'Hourly to multi-day hire with a dedicated vehicle. Ideal when the itinerary is still taking shape.'],
  ['driver.hourly.title', 'Hourly heading', 'Hourly'],
  ['driver.hourly.body', 'Hourly description', 'City hops, meetings and flexible short windows.'],
  ['driver.day.title', 'Day hire heading', 'Half-day & full-day'],
  ['driver.day.body', 'Day hire description', 'Sightseeing loops with room to change the order of stops.'],
  ['driver.multi.title', 'Multi-day heading', 'Multi-day vacation driver'],
  ['driver.multi.body', 'Multi-day description', 'Ring Road segments and multi-stop itineraries, request a quotation for custom days.'],
  ['home.driver.title', 'Private driver heading', 'A private driver for your whole stay'],
  ['home.driver.body', 'Private driver description', 'Keep the same driver and vehicle for a few hours or several days. Plan your itinerary together, or ask for a custom quotation.'],
  ['about.kicker', 'About label', 'Iceland Taxi Booking'],
  ['about.title', 'About heading', 'Company-owned transport, booked around your trip'],
  ['about.lead', 'About introduction', 'We design airport transfers, private taxis, sightseeing tours and vacation drivers as one booking experience, clear prices, flight-aware pickups and in-app messaging when plans change.'],
  ['about.whatTitle', 'About section heading', 'What we are'],
  ['about.what1', 'About first paragraph', 'Iceland Taxi Booking is a company booking platform, not an open taxi marketplace. Services, vehicles, routes and prices are managed by the operations team and published to the site when ready.'],
  ['about.what2', 'About second paragraph', 'Company contact details, registrations and fleet facts live in the CMS so they stay accurate. This page describes how the product works; published company facts appear when administrators add them.'],
  ['about.value1.title', 'About value 1 title', 'Private vehicles only'],
  ['about.value1.body', 'About value 1 text', 'Every trip is a private booking, no shared shuttles, no open marketplace. You choose the vehicle class that fits your luggage and group.'],
  ['about.value2.title', 'About value 2 title', 'Built around Iceland travel'],
  ['about.value2.body', 'About value 2 text', 'Airport meets, sightseeing days and multi-day private drivers are priced and scheduled as distinct services, with waiting-time rules shown before you pay.'],
  ['about.value3.title', 'About value 3 title', 'You stay in control'],
  ['about.value3.body', 'About value 3 text', 'Book as a guest or with an account. Track status, message the team, request changes and keep receipts from one booking reference.'],
  ['services.airport.title', 'Services: airport title', 'Airport transfers'],
  ['services.airport.body', 'Services: airport text', 'Private meets at KEF with flight tracking, fixed routes to Reykjavík, Blue Lagoon and southwest hotels.'],
  ['services.taxi.title', 'Services: taxi title', 'Private taxi'],
  ['services.taxi.body', 'Services: taxi text', 'Point-to-point city and regional rides with vehicle classes sized for passengers and luggage.'],
  ['services.tours.title', 'Services: tours title', 'Private tours'],
  ['services.tours.body', 'Services: tours text', 'Golden Circle, South Coast, Northern Lights and custom day tours, your pace, your stops.'],
  ['services.driver.title', 'Services: driver title', 'Private driver'],
  ['services.driver.body', 'Services: driver text', 'Hourly, half-day, full-day and multi-day chauffeur hire for itineraries that change on the road.'],
  ['services.corporate.title', 'Services: corporate title', 'Corporate travel'],
  ['services.corporate.body', 'Services: corporate text', 'Staff transfers, visitor meets and invoiced company bookings. Send a custom enquiry for a trip that is not already published.'],
  ...FAQS.flatMap((item, index) => [
    [`faq.${index}.q`, `FAQ ${index + 1} question`, item.q],
    [`faq.${index}.a`, `FAQ ${index + 1} answer`, item.a],
  ] as [string, string, string][]),
].map(([key, label, value]) => ({ key, kind: 'text' as const, group: key.startsWith('airport.') ? 'Airport transfers' : key.startsWith('tours.') ? 'Private tours' : key.startsWith('driver.') ? 'Private driver' : key.startsWith('faq') ? 'FAQs' : key.startsWith('about') ? 'About' : key.startsWith('services') ? 'Services' : 'Homepage', label, value }))

export const SITE_BLOCKS: SiteBlockDef[] = [...images, ...texts]

export const SITE_DEFAULTS: Record<string, string> = Object.fromEntries(SITE_BLOCKS.map((block) => [block.key, block.value]))

export function siteImageMap(blocks: Record<string, string>) {
  const pick = (key: keyof typeof IMG) => blocks[`image.${key}`] || IMG[key]
  return {
    hero: pick('hero'),
    airport: pick('airport'),
    goldenCircle: pick('goldenCircle'),
    northernLights: pick('northernLights'),
    southCoast: pick('southCoast'),
    privateDriver: pick('privateDriver'),
    fleet: pick('fleet'),
    reykjavik: pick('reykjavik'),
    glacierLagoon: pick('glacierLagoon'),
    blueLagoon: pick('blueLagoon'),
    logoLight: (blocks['image.logoLight'] || LOGO_LIGHT).replace(/^\/brand\/logo-dark-navy-text\.png$/, '/brand/logo-dark-navy-text.webp'),
    logoDark: (blocks['image.logoDark'] || LOGO_DARK).replace(/^\/brand\/logo-dark-white-text\.png$/, '/brand/logo-dark-white-text.webp'),
  }
}
