// Official tour and transfer list. Stored in ISK so the public euro price matches
// the list while the exchange rate is 150 ISK per euro. Admin can edit or delete
// every service, route and add-on afterwards.
export const REFERENCE_EUR_RATE = 150

export function eurToIsk(euros: number) {
  return Math.round(euros * REFERENCE_EUR_RATE)
}

type OfficialService = {
  slug: string
  titleEn: string
  kind: 'AIRPORT' | 'TAXI' | 'TOUR' | 'DRIVER' | 'CUSTOM'
  fromIsk: number
  sortOrder: number
  hoursLabel?: string
  paxLabel?: string
  blurbEn?: string
  imageUrl?: string
}

type OfficialRoute = {
  key: string
  serviceSlug: string
  fromLabel: string
  toLabel: string
  minutes: number | null
  fromIsk: number
  returnTrip: boolean
  imageUrl: string
}

const car = (band: '1–4 persons' | '5–8 persons') => `Car · ${band}`

const routePhotos = [
  '/photos/reykjavik.jpg',
  '/photos/hero.jpg',
  '/photos/golden-circle.jpg',
  '/photos/glacier-lagoon.jpg',
  '/photos/south-coast.jpg',
  '/photos/blue-lagoon.jpg',
  '/photos/northern-lights.jpg',
  '/photos/fleet.jpg',
  '/photos/airport.jpg',
  '/photos/private-driver.jpg',
]
let routePhotoIndex = 0
function nextRoutePhoto() {
  const photo = routePhotos[routePhotoIndex % routePhotos.length]
  routePhotoIndex += 1
  return photo
}

function route(
  key: string,
  serviceSlug: string,
  fromLabel: string,
  toLabel: string,
  euros: number,
  options: { minutes?: number | null; returnTrip?: boolean; imageUrl?: string } = {},
): OfficialRoute {
  return {
    key,
    serviceSlug,
    fromLabel,
    toLabel,
    minutes: options.minutes ?? null,
    fromIsk: eurToIsk(euros),
    returnTrip: options.returnTrip ?? false,
    imageUrl: options.imageUrl || nextRoutePhoto(),
  }
}

export const REFERENCE_ROUTES: OfficialRoute[] = [
  route('city-1-4', 'city-transfer', 'Reykjavík city centre', `City ride · ${car('1–4 persons')}`, 25),
  route('city-5-8', 'city-transfer', 'Reykjavík city centre', `City ride · ${car('5–8 persons')}`, 35),

  route('kef-1-4', 'airport-transfer', 'Keflavík Airport (KEF)', `Reykjavík · ${car('1–4 persons')}`, 160),
  route('kef-5-8', 'airport-transfer', 'Keflavík Airport (KEF)', `Reykjavík · ${car('5–8 persons')}`, 205),

  route('reykjavik-sightseeing-1-4', 'reykjavik-sightseeing', 'Reykjavík', `Sightseeing · 2 hours · ${car('1–4 persons')}`, 180, { minutes: 120, imageUrl: '/photos/reykjavik.jpg' }),
  route('reykjavik-sightseeing-5-8', 'reykjavik-sightseeing', 'Reykjavík', `Sightseeing · 2 hours · ${car('5–8 persons')}`, 240, { minutes: 120, imageUrl: '/photos/hero.jpg' }),

  route('golden-circle-1-4', 'golden-circle', 'Reykjavík', `Golden Circle · ${car('1–4 persons')}`, 680, { minutes: 360, imageUrl: '/photos/golden-circle.jpg' }),
  route('golden-circle-5-8', 'golden-circle', 'Reykjavík', `Golden Circle · ${car('5–8 persons')}`, 890, { minutes: 360, imageUrl: '/photos/glacier-lagoon.jpg' }),

  route('south-coast-1-4', 'south-coast', 'Reykjavík', `South Coast · ${car('1–4 persons')}`, 980, { minutes: 720, imageUrl: '/photos/south-coast.jpg' }),
  route('south-coast-5-8', 'south-coast', 'Reykjavík', `South Coast · ${car('5–8 persons')}`, 1190, { minutes: 720, imageUrl: '/photos/blue-lagoon.jpg' }),

  route('silver-circle-1-4', 'silver-circle', 'Reykjavík', `Silver Circle · ${car('1–4 persons')}`, 610, { minutes: 360, imageUrl: '/photos/northern-lights.jpg' }),
  route('silver-circle-5-8', 'silver-circle', 'Reykjavík', `Silver Circle · ${car('5–8 persons')}`, 810, { minutes: 360, imageUrl: '/photos/fleet.jpg' }),

  route('snaefellsnes-1-4', 'snaefellsnes', 'Reykjavík', `Snæfellsnes Peninsula · ${car('1–4 persons')}`, 1090, { minutes: 720, imageUrl: '/photos/airport.jpg' }),
  route('snaefellsnes-5-8', 'snaefellsnes', 'Reykjavík', `Snæfellsnes Peninsula · ${car('5–8 persons')}`, 1320, { minutes: 720, imageUrl: '/photos/private-driver.jpg' }),

  route('krysuvik-1-4', 'krysuvik-reykjanes', 'Reykjavík', `Krýsuvík and Reykjanes · ${car('1–4 persons')}`, 470, { imageUrl: '/photos/glacier-lagoon.jpg' }),
  route('krysuvik-5-8', 'krysuvik-reykjanes', 'Reykjavík', `Krýsuvík and Reykjanes · ${car('5–8 persons')}`, 620, { imageUrl: '/photos/south-coast.jpg' }),

  route('blue-lagoon-one-1-4', 'blue-lagoon-transfer', 'Reykjavík', `Blue Lagoon · one way · ${car('1–4 persons')}`, 160),
  route('blue-lagoon-one-5-8', 'blue-lagoon-transfer', 'Reykjavík', `Blue Lagoon · one way · ${car('5–8 persons')}`, 205),
  route('blue-lagoon-return-1-4', 'blue-lagoon-transfer', 'Reykjavík', `Blue Lagoon · return, 4 hours · ${car('1–4 persons')}`, 330, { minutes: 240, returnTrip: true }),
  route('blue-lagoon-return-5-8', 'blue-lagoon-transfer', 'Reykjavík', `Blue Lagoon · return, 4 hours · ${car('5–8 persons')}`, 410, { minutes: 240, returnTrip: true }),

  route('hvammsvik-one-1-4', 'hvammsvik-transfer', 'Reykjavík', `Hvammsvík Hot Springs · one way · ${car('1–4 persons')}`, 195),
  route('hvammsvik-one-5-8', 'hvammsvik-transfer', 'Reykjavík', `Hvammsvík Hot Springs · one way · ${car('5–8 persons')}`, 260),
  route('hvammsvik-return-1-4', 'hvammsvik-transfer', 'Reykjavík', `Hvammsvík Hot Springs · return, 4 hours · ${car('1–4 persons')}`, 390, { minutes: 240, returnTrip: true }),
  route('hvammsvik-return-5-8', 'hvammsvik-transfer', 'Reykjavík', `Hvammsvík Hot Springs · return, 4 hours · ${car('5–8 persons')}`, 520, { minutes: 240, returnTrip: true }),

  route('lava-tunnel-one-1-4', 'lava-tunnel-transfer', 'Reykjavík', `Lava Tunnel · one way · ${car('1–4 persons')}`, 160),
  route('lava-tunnel-one-5-8', 'lava-tunnel-transfer', 'Reykjavík', `Lava Tunnel · one way · ${car('5–8 persons')}`, 200),
  route('lava-tunnel-return-1-4', 'lava-tunnel-transfer', 'Reykjavík', `Lava Tunnel · return, 2.5 hours · ${car('1–4 persons')}`, 330, { minutes: 150, returnTrip: true }),
  route('lava-tunnel-return-5-8', 'lava-tunnel-transfer', 'Reykjavík', `Lava Tunnel · return, 2.5 hours · ${car('5–8 persons')}`, 410, { minutes: 150, returnTrip: true }),
]

export function separateRoutePhoto(index: number, taken: Iterable<string>) {
  const used = new Set(taken)
  const available = routePhotos.filter((photo) => !used.has(photo))
  const pool = available.length ? available : routePhotos
  return pool[Math.max(0, index) % pool.length]
}

export function referenceRouteImage(fromLabel: string, toLabel: string) {
  const key = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
  return REFERENCE_ROUTES.find((row) => key(row.fromLabel) === key(fromLabel) && key(row.toLabel) === key(toLabel))?.imageUrl || null
}

function lowest(slug: string) {
  return Math.min(...REFERENCE_ROUTES.filter((row) => row.serviceSlug === slug).map((row) => row.fromIsk))
}

export const REFERENCE_SERVICES: OfficialService[] = [
  { slug: 'city-transfer', titleEn: 'City transfer', kind: 'TAXI', fromIsk: lowest('city-transfer'), paxLabel: '1–4 or 5–8 persons', sortOrder: 1 },
  { slug: 'airport-transfer', titleEn: 'Airport transfer', kind: 'AIRPORT', fromIsk: lowest('airport-transfer'), paxLabel: '1–4 or 5–8 persons', sortOrder: 2 },
  { slug: 'reykjavik-sightseeing', titleEn: 'Reykjavík sightseeing', kind: 'TOUR', fromIsk: lowest('reykjavik-sightseeing'), hoursLabel: '2 hours', paxLabel: '1–4 or 5–8 persons', sortOrder: 3, imageUrl: '/photos/reykjavik.jpg' },
  {
    slug: 'golden-circle',
    titleEn: 'Golden Circle',
    kind: 'TOUR',
    fromIsk: lowest('golden-circle'),
    hoursLabel: '6 hours',
    paxLabel: '1–4 or 5–8 persons',
    blurbEn: 'Þingvellir, Geysir and Strokkur, Gullfoss, and two or three stops on the way back. Price is per car.',
    imageUrl: '/photos/golden-circle.jpg',
    sortOrder: 4,
  },
  {
    slug: 'south-coast',
    titleEn: 'South Coast',
    kind: 'TOUR',
    fromIsk: lowest('south-coast'),
    hoursLabel: '12 hours',
    paxLabel: '1–4 or 5–8 persons',
    blurbEn: 'Seljalandsfoss, Skógafoss, the black beach and Vík. Price is per car.',
    imageUrl: '/photos/south-coast.jpg',
    sortOrder: 5,
  },
  {
    slug: 'silver-circle',
    titleEn: 'Silver Circle',
    kind: 'TOUR',
    fromIsk: lowest('silver-circle'),
    hoursLabel: '6 hours',
    paxLabel: '1–4 or 5–8 persons',
    blurbEn: 'Hvalfjörður, Hraunfossar, Barnafoss, Deildartunguhver and Borgarnes, returning through the Hvalfjörður tunnel. Price is per car.',
    sortOrder: 6,
  },
  {
    slug: 'snaefellsnes',
    titleEn: 'Snæfellsnes Peninsula',
    kind: 'TOUR',
    fromIsk: lowest('snaefellsnes'),
    hoursLabel: '12 hours',
    paxLabel: '1–4 or 5–8 persons',
    blurbEn: 'The Snæfellsnes peninsula, including Kirkjufell. Price is per car.',
    sortOrder: 7,
  },
  {
    slug: 'krysuvik-reykjanes',
    titleEn: 'Krýsuvík and Reykjanes',
    kind: 'TOUR',
    fromIsk: lowest('krysuvik-reykjanes'),
    paxLabel: '1–4 or 5–8 persons',
    blurbEn: 'This tour depends on road closures in the volcanic area. Price is per car.',
    sortOrder: 8,
  },
  {
    slug: 'blue-lagoon-transfer',
    titleEn: 'Blue Lagoon transfer',
    kind: 'TAXI',
    fromIsk: lowest('blue-lagoon-transfer'),
    paxLabel: '1–4 or 5–8 persons',
    blurbEn: 'One way, or a return with about 4 hours in total. Entrance must already be booked. The transfer price does not include the entrance ticket.',
    imageUrl: '/photos/blue-lagoon.jpg',
    sortOrder: 9,
  },
  {
    slug: 'hvammsvik-transfer',
    titleEn: 'Hvammsvík Hot Springs transfer',
    kind: 'TAXI',
    fromIsk: lowest('hvammsvik-transfer'),
    paxLabel: '1–4 or 5–8 persons',
    blurbEn: 'One way, or a return with about 4 hours in total. Entrance must already be booked. The transfer price does not include the entrance ticket.',
    sortOrder: 10,
  },
  {
    slug: 'lava-tunnel-transfer',
    titleEn: 'Lava Tunnel transfer',
    kind: 'TAXI',
    fromIsk: lowest('lava-tunnel-transfer'),
    paxLabel: '1–4 or 5–8 persons',
    blurbEn: 'Transfer to Raufarhólshellir. One way, or a return with about 2.5 hours in total. Entrance must already be booked. The transfer price does not include the entrance ticket.',
    sortOrder: 11,
  },
]

export const REFERENCE_EXTRAS = [
  { key: 'meet-greet', labelEn: 'Meet and greet at airport arrivals', isk: 0, active: true, sortOrder: 1 },
  { key: 'entrance-prebooked', labelEn: 'Attraction entrance, booked separately by the guest', isk: 0, active: true, sortOrder: 2 },
] as const
