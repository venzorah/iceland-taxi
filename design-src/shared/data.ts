// Demo seed content. In production every value here comes from the API
// (services, routes, prices, fleet, destinations, company settings).

export const LOGO_LIGHT = '/brand/logo-dark-navy-text.png'
export const LOGO_DARK = '/brand/logo-dark-white-text.png'

export const IMG = {
  hero: '/photos/hero.jpg',
  airport: '/photos/airport.jpg',
  goldenCircle: '/photos/golden-circle.jpg',
  northernLights: '/photos/northern-lights.jpg',
  southCoast: '/photos/south-coast.jpg',
  privateDriver: '/photos/private-driver.jpg',
  fleet: '/photos/fleet.jpg',
  reykjavik: '/photos/reykjavik.jpg',
  glacierLagoon: '/photos/glacier-lagoon.jpg',
  blueLagoon: '/photos/blue-lagoon.jpg',
}

/** Admin-configured exchange rate (ISK per 1 USD). */
export const ISK_PER_USD = 138

export type Currency = 'USD' | 'ISK'

export function formatPrice(isk: number, currency: Currency) {
  if (currency === 'ISK') return `${isk.toLocaleString('en-US').replace(/,/g, '.')} kr`
  return `$${Math.round(isk / ISK_PER_USD).toLocaleString('en-US')}`
}

export const SERVICE_CATEGORIES = [
  { id: 'airport', label: 'Airport transfer' },
  { id: 'taxi', label: 'Private taxi' },
  { id: 'tour', label: 'Private tour' },
  { id: 'driver', label: 'Private driver' },
] as const

export const AIRPORT_ROUTES = [
  { from: 'Keflavík Airport (KEF)', to: 'Reykjavík city centre', minutes: 45, km: 49, fromIsk: 22900 },
  { from: 'Keflavík Airport (KEF)', to: 'Blue Lagoon', minutes: 20, km: 23, fromIsk: 14900 },
  { from: 'Reykjavík hotel', to: 'Keflavík Airport (KEF)', minutes: 45, km: 49, fromIsk: 22900 },
  { from: 'Keflavík Airport (KEF)', to: 'Selfoss', minutes: 75, km: 100, fromIsk: 39900 },
]

export const TOURS = [
  { id: 'golden-circle', title: 'Golden Circle Private Tour', img: IMG.goldenCircle, hours: '7–8 h', pax: 'Up to 8', fromIsk: 89900, blurb: 'Þingvellir, Geysir and Gullfoss at your own pace.' },
  { id: 'south-coast', title: 'South Coast Private Tour', img: IMG.southCoast, hours: '10–11 h', pax: 'Up to 8', fromIsk: 119900, blurb: 'Seljalandsfoss, Skógafoss and the black sands of Reynisfjara.' },
  { id: 'northern-lights', title: 'Northern Lights Experience', img: IMG.northernLights, hours: '3–4 h', pax: 'Up to 8', fromIsk: 59900, blurb: 'Your driver follows the forecast away from city light.' },
]

export const DESTINATIONS = [
  { name: 'Golden Circle', img: IMG.goldenCircle, note: '1 h from Reykjavík' },
  { name: 'Glacier Lagoon', img: IMG.glacierLagoon, note: '5 h from Reykjavík' },
  { name: 'Blue Lagoon', img: IMG.blueLagoon, note: '20 min from KEF' },
  { name: 'Reykjavík', img: IMG.reykjavik, note: 'City tours & hotel transfers' },
  { name: 'South Coast', img: IMG.southCoast, note: '2 h from Reykjavík' },
]

export const FLEET = [
  { name: 'Standard Sedan', pax: 3, bags: 3, use: 'Airport & city rides' },
  { name: 'Comfort Sedan', pax: 3, bags: 3, use: 'Longer transfers' },
  { name: 'Premium Sedan', pax: 3, bags: 2, use: 'Business & chauffeur' },
  { name: 'SUV', pax: 4, bags: 4, use: 'Winter roads & tours' },
  { name: 'Minivan', pax: 7, bags: 7, use: 'Families & small groups' },
  { name: 'Minibus', pax: 16, bags: 16, use: 'Groups & events' },
]

export const FAQS = [
  { q: 'Do I need an account to book?', a: 'No. You can book as a guest with your name, email and phone number. You will receive a booking reference that lets you look up and manage your booking later.' },
  { q: 'Which currency will I pay in?', a: 'International visitors pay in USD. Icelandic residents can choose ISK or USD. The currency shown at checkout is the currency you are charged in.' },
  { q: 'What happens if my flight is delayed?', a: 'Add your flight number when booking. Your driver tracks the arrival time, and waiting-time rules for your booking are shown before you pay.' },
  { q: 'Can I hire a driver for several days?', a: 'Yes. Choose Private driver and select hourly, half-day, full-day or multi-day. For a custom itinerary, send a quotation request and we will reply with a price.' },
  { q: 'Can I cancel or change my booking?', a: 'You can request changes or a cancellation from your booking page or by message. Cancellation terms for each service are shown before you pay.' },
]
