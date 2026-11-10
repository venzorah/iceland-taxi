// Demo seed content. In production every value here comes from the API
// (services, routes, prices, fleet, destinations, company settings).

export const LOGO_LIGHT =
  'https://cdn.magicpatterns.com/uploads/gMwiMgCMZFXsEnRtvTnbVv/Iceland_Taxi_Booking_Logo_(1).png'
export const LOGO_DARK =
  'https://cdn.magicpatterns.com/uploads/9CkqqBM3RDtr2Gww2eVrGc/Iceland_Taxi_Booking_Logo.png'

export const IMG = {
  hero: 'https://cdn.magicpatterns.com/patterns/generated-images/7db922cc-9fca-421a-b5d1-a03e222e9570.jpg',
  airport: 'https://cdn.magicpatterns.com/patterns/generated-images/eaad9406-8077-461d-b065-8f05c7371f6b.jpg',
  goldenCircle: 'https://cdn.magicpatterns.com/patterns/generated-images/e3147a54-6262-4018-8ef0-4aa996090a25.jpg',
  northernLights: 'https://cdn.magicpatterns.com/patterns/generated-images/393a50f2-7ddb-4702-97b9-db093684d1a3.jpg',
  southCoast: 'https://cdn.magicpatterns.com/patterns/generated-images/b8399b1f-8dbe-43f9-b02a-7b7cc03acb28.jpg',
  privateDriver: 'https://cdn.magicpatterns.com/patterns/generated-images/ab63a697-a74d-4cb8-ba4e-420b0676a52f.jpg',
  fleet: 'https://cdn.magicpatterns.com/patterns/generated-images/bb2684b8-70ee-41bf-a260-8cde5cd7b4d2.jpg',
  reykjavik: 'https://cdn.magicpatterns.com/patterns/generated-images/6c762c8f-4671-4ed3-896e-4f1c0f17f247.jpg',
  glacierLagoon: 'https://cdn.magicpatterns.com/patterns/generated-images/1d4a0a8f-4487-4611-91fc-fa86a995378e.jpg',
  blueLagoon: 'https://cdn.magicpatterns.com/patterns/generated-images/7d74ce25-2bd0-4460-a6ce-62e8ff747133.jpg',
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
