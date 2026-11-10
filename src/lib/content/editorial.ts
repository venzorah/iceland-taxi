import { IMG } from '@/lib/design/data'

export type Editorial = {
  slug: string
  title: string
  date: string
  tag: string
  minutes: string
  img: string
  excerpt: string
  body: string[]
}

/** Editorial seed. Practical travel notes, not testimonials or company contact details. */
export const BLOG_POSTS: Editorial[] = [
  {
    slug: 'kef-arrival-march',
    title: 'What to pack for a KEF arrival in March',
    date: '2 Mar 2025',
    tag: 'Airport',
    minutes: '4 min',
    img: IMG.airport,
    excerpt: 'Layers, studded-tyre season and why flight numbers help your driver.',
    body: [
      'March in Iceland is still winter driving. Roads can be icy, and airport transfers use vehicles prepared for that season. Pack a warm layer you can put on as soon as you leave the terminal, and keep one small bag with anything you need for the first hour.',
      'Add your flight number when you book an airport transfer. The pickup window follows the actual arrival, and the waiting-time rules for that booking are shown before you pay.',
      'If you are continuing the same day, say so in the booking notes. A private transfer can go to a hotel, the Blue Lagoon, or another southwest stop. Multi-stop days are priced as a tour or a private-driver booking, not as a simple airport route.',
    ],
  },
  {
    slug: 'golden-circle-without-rushing',
    title: 'Planning a Golden Circle day without rushing',
    date: '18 Feb 2025',
    tag: 'Tours',
    minutes: '4 min',
    img: IMG.goldenCircle,
    excerpt: 'How private tours leave room for longer stops at Geysir and Gullfoss.',
    body: [
      'A private Golden Circle day is usually about seven to eight hours from Reykjavík, including the drive and time at Þingvellir, Geysir and Gullfoss. The point of a private tour is that the stop lengths are yours, within daylight and the driver’s hours.',
      'Tell the booking how many people and bags are travelling so the vehicle class matches the group. Prices for the published tours are shown in euro for international visitors and in ISK when a resident chooses that currency.',
      'If you want extra stops, or a different order, use a private-driver day or a quotation request instead of the fixed Golden Circle tour. The difference is shown on the tours and private-driver pages before checkout.',
    ],
  },
  {
    slug: 'eur-vs-isk',
    title: 'EUR vs ISK at checkout: who chooses what',
    date: '5 Feb 2025',
    tag: 'Booking',
    minutes: '3 min',
    img: IMG.reykjavik,
    excerpt: 'International visitors pay in euro. Residents can choose ISK, and the currency is shown before payment.',
    body: [
      'International visitors pay in euro. Icelandic residents can choose ISK or euro. The amount on the checkout screen is the amount charged, in that currency.',
      'Catalogue prices are stored in ISK and shown to the public as euro with a dot as the thousands separator, or as ISK with a comma thousands separator, for example ISK 22,900.',
      'Older bookings that were priced in US dollars keep that dollar snapshot. New public prices are not shown in dollars.',
    ],
  },
  {
    slug: 'aurora-forecast',
    title: 'Reading the aurora forecast before you book',
    date: '22 Jan 2025',
    tag: 'Northern Lights',
    minutes: '4 min',
    img: IMG.northernLights,
    excerpt: 'Cloud cover, solar activity and flexible evening windows with a private driver.',
    body: [
      'A northern lights booking is an evening window with a driver, not a guarantee of a display. Cloud cover and the solar forecast both matter, and the driver uses that evening’s conditions to choose a direction away from city light.',
      'Book the evening as its own service when you already have a hotel. If the lights hunt is one stop on a longer private-driver day, say that in the quotation so the hours and vehicle are priced together.',
      'Wear the same winter layers you would for standing outside. The car is warm between stops. The forecast can change, so keep the booking reference handy if you need to message about the pickup time.',
    ],
  },
]

export const TRAVEL_GUIDES: Editorial[] = [
  {
    slug: 'first-night-reykjavik',
    title: 'First night in Reykjavík after a late flight',
    date: 'Guide',
    tag: 'Arrivals',
    minutes: '6 min',
    img: IMG.reykjavik,
    excerpt: 'Hotel meets, luggage, and when a private transfer beats a taxi queue.',
    body: [
      'A late arrival at Keflavík is a fixed-route transfer if you are going to one hotel or address in Reykjavík. The published route time is about 45 minutes before traffic and weather. Your booking shows the price before you pay.',
      'Put the hotel name in the destination field and the flight number in the booking. The driver meets you after baggage claim. If you have more bags than a sedan allows, choose the vehicle class that lists enough luggage space.',
      'A late flight is not a good moment to add a long sightseeing stop. If you want the Blue Lagoon the same night, book that as the destination or as its own route so the timing is explicit.',
    ],
  },
  {
    slug: 'blue-lagoon-timing',
    title: 'Blue Lagoon before or after KEF',
    date: 'Guide',
    tag: 'Airport',
    minutes: '5 min',
    img: IMG.blueLagoon,
    excerpt: 'Timing a lagoon stop around arrivals and departures without missing a flight.',
    body: [
      'The Blue Lagoon is about 20 minutes from Keflavík Airport, so it can sit between a flight and Reykjavík, or on the way back to a departure. The transfer itself is only the car. Lagoon entry is booked with the lagoon, not with the taxi.',
      'On departure day, leave enough time for the drive, a buffer, and the airport process. Say the flight time in the booking notes so the pickup is planned backwards from that.',
      'If the lagoon is one stop on a longer day, use a private tour or private driver instead of chaining two airport routes. The services page explains which booking type fits.',
    ],
  },
  {
    slug: 'south-coast-one-day',
    title: 'South Coast in one long day',
    date: 'Guide',
    tag: 'Tours',
    minutes: '8 min',
    img: IMG.southCoast,
    excerpt: 'Waterfalls, black sand and daylight windows by season.',
    body: [
      'A South Coast day from Reykjavík is a long drive, often about ten to eleven hours with stops at waterfalls and the black sand beach. Winter daylight is short, so the same route has less time outside the car than a summer day.',
      'The published private tour covers the standard stops. Extra detours, or a night away, belong on a private-driver or quotation booking so the hours are agreed before you pay.',
      'Weather can close a viewpoint even when the road is open. The driver follows the conditions that day. Your booking reference is how you message about a change.',
    ],
  },
  {
    slug: 'glacier-lagoon-day',
    title: 'Glacier Lagoon as a private-driver day',
    date: 'Guide',
    tag: 'Driver',
    minutes: '7 min',
    img: IMG.glacierLagoon,
    excerpt: 'Distance, stops and why fixed tours vs multi-stop driver days differ.',
    body: [
      'Jökulsárlón is about five hours from Reykjavík each way, so a return visit is a full day or an overnight. It is not an add-on to a Golden Circle morning.',
      'A fixed tour has a set route and a from-price. A private-driver day is hourly or a quoted itinerary when you want to choose the stops and the order. Both show the currency before payment.',
      'Boat or ice-cave tickets, if you want them, are separate from the car. Note them in the booking so the driver can plan the waiting time that was agreed.',
    ],
  },
]

export function findEditorial(kind: 'blog' | 'guide', slug: string) {
  const list = kind === 'blog' ? BLOG_POSTS : TRAVEL_GUIDES
  return list.find((item) => item.slug === slug) ?? null
}

/** Published SEO slugs in the admin catalogue, mapped to the live public page. */
export const SEO_SLUG_PAGES: { slug: string; title: string; href: string; published: boolean }[] = [
  { slug: 'keflavik-airport-transfer', title: 'Keflavík Airport Transfer', href: '/airport-transfer', published: true },
  { slug: 'keflavik-airport-to-reykjavik', title: 'Keflavík Airport to Reykjavík', href: '/airport-transfer', published: true },
  { slug: 'private-driver-iceland', title: 'Private Driver Iceland', href: '/private-driver', published: true },
  { slug: 'golden-circle-private-tour', title: 'Golden Circle Private Tour', href: '/private-tours', published: true },
  { slug: 'private-chauffeur-iceland', title: 'Private Chauffeur Iceland', href: '/private-driver', published: false },
]
