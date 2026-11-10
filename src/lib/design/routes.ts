/** Canonical public website paths — keep header/footer/nav in sync. */

export const PUBLIC_PATHS = {
  home: '/',
  book: '/book',
  about: '/about',
  contact: '/contact',
  services: '/services',
  destinations: '/destinations',
  fleet: '/fleet',
  howItWorks: '/how-it-works',
  faqs: '/faqs',
  blog: '/blog',
  travelGuides: '/travel-guides',
  policies: '/policies',
  manageBooking: '/manage-booking',
  airportTransfer: '/airport-transfer',
  privateTours: '/private-tours',
  privateDriver: '/private-driver',
  account: '/account',
  messages: '/messages',
  admin: '/admin',
  mobileAdmin: '/m',
  driver: '/driver',
} as const

export type PublicPathKey = keyof typeof PUBLIC_PATHS

/** Header primary nav (EN keys map through i18n). */
export const HEADER_NAV: { i18n: 'airport' | 'tours' | 'driver' | 'fleet' | 'contact'; href: string }[] = [
  { i18n: 'airport', href: PUBLIC_PATHS.airportTransfer },
  { i18n: 'tours', href: PUBLIC_PATHS.privateTours },
  { i18n: 'driver', href: PUBLIC_PATHS.privateDriver },
  { i18n: 'fleet', href: PUBLIC_PATHS.fleet },
  { i18n: 'contact', href: PUBLIC_PATHS.contact },
]

export const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Services',
    links: [
      { label: 'Airport transfers', href: PUBLIC_PATHS.airportTransfer },
      { label: 'Private taxi', href: `${PUBLIC_PATHS.book}?category=taxi` },
      { label: 'Private tours', href: PUBLIC_PATHS.privateTours },
      { label: 'Private driver', href: PUBLIC_PATHS.privateDriver },
      { label: 'Corporate travel', href: PUBLIC_PATHS.services },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Destinations', href: PUBLIC_PATHS.destinations },
      { label: 'Our fleet', href: PUBLIC_PATHS.fleet },
      { label: 'How it works', href: PUBLIC_PATHS.howItWorks },
      { label: 'Travel guides', href: PUBLIC_PATHS.travelGuides },
      { label: 'Blog', href: PUBLIC_PATHS.blog },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: PUBLIC_PATHS.about },
      { label: 'Contact', href: PUBLIC_PATHS.contact },
      { label: 'FAQs', href: PUBLIC_PATHS.faqs },
      { label: 'Manage booking', href: PUBLIC_PATHS.manageBooking },
    ],
  },
  {
    title: 'Policies',
    links: [
      { label: 'Privacy policy', href: `${PUBLIC_PATHS.policies}?policy=privacy` },
      { label: 'Terms & conditions', href: `${PUBLIC_PATHS.policies}?policy=terms` },
      { label: 'Cancellation policy', href: `${PUBLIC_PATHS.policies}?policy=cancellation` },
      { label: 'Refund policy', href: `${PUBLIC_PATHS.policies}?policy=refund` },
    ],
  },
]

export const SEO_PUBLIC_PAGES: { path: string; titleEn: string; descriptionEn: string }[] = [
  { path: '/about', titleEn: 'About us', descriptionEn: 'Company-owned private transport booked around your Iceland trip.' },
  { path: '/contact', titleEn: 'Contact', descriptionEn: 'Message Iceland Taxi Booking about a booking, quotation or partnership.' },
  { path: '/services', titleEn: 'Services', descriptionEn: 'Airport transfers, private taxis, tours, private drivers and corporate travel.' },
  { path: '/destinations', titleEn: 'Destinations', descriptionEn: 'Popular Iceland destinations for transfers, tours and private-driver days.' },
  { path: '/fleet', titleEn: 'Our fleet', descriptionEn: 'Sedan, SUV, minivan and minibus classes sized for passengers and luggage.' },
  { path: '/how-it-works', titleEn: 'How it works', descriptionEn: 'Choose a trip, confirm details, pay in EUR or ISK, then track and message.' },
  { path: '/faqs', titleEn: 'FAQs', descriptionEn: 'Answers about booking, currency, flight delays, multi-day drivers and cancellations.' },
  { path: '/blog', titleEn: 'Blog', descriptionEn: 'Practical travel notes for airport arrivals, tours and booking in Iceland.' },
  { path: '/travel-guides', titleEn: 'Travel guides', descriptionEn: 'Longer guides for Reykjavík arrivals, Blue Lagoon timing and South Coast days.' },
  { path: '/policies', titleEn: 'Policies', descriptionEn: 'Privacy, terms, cancellation and refund policies.' },
  { path: '/manage-booking', titleEn: 'Manage booking', descriptionEn: 'Look up a trip with your booking reference and checkout email.' },
  { path: '/airport-transfer', titleEn: 'Airport transfers', descriptionEn: 'Private Keflavík Airport transfers with flight tracking and fixed-price routes.' },
  { path: '/private-tours', titleEn: 'Private tours', descriptionEn: 'Private Golden Circle, South Coast and Northern Lights sightseeing tours.' },
  { path: '/private-driver', titleEn: 'Private driver', descriptionEn: 'Hourly to multi-day private chauffeur hire across Iceland.' },
]
