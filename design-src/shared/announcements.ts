// Announcement bar content. Managed in Admin → Website → Announcements,
// shown in the scrolling bar above the site menu on every public page.

export type Announcement = {
  id: string
  /** English text, shown when the site is in English. */
  text: string
  /** Icelandic text. Falls back to English when empty. */
  textIs: string
  linkLabel: string
  linkUrl: string
  active: boolean
  /** ISO dates, both optional. Outside the window the message is held back. */
  starts: string
  ends: string
}

export type BarStyle = 'navy' | 'yellow' | 'mint'
export type BarSpeed = 'slow' | 'normal' | 'fast'

export type AnnouncementSettings = {
  enabled: boolean
  speed: BarSpeed
  style: BarStyle
  pauseOnHover: boolean
}

export type AnnouncementState = {
  settings: AnnouncementSettings
  items: Announcement[]
}

/** The demo's "today", matching the booking flow's default date. */
export const TODAY = '2025-03-14'

export const ANNOUNCEMENTS_SEED: AnnouncementState = {
  settings: { enabled: true, speed: 'normal', style: 'navy', pauseOnHover: true },
  items: [
    {
      id: 'winter',
      text: 'Winter roads: every vehicle runs studded tyres and our drivers check road.is before each trip.',
      textIs: 'Vetrarfærð: allir bílar eru á negldum dekkjum og bílstjórar fylgjast með road.is fyrir hverja ferð.',
      linkLabel: 'Travel advice',
      linkUrl: '/travel-advice',
      active: true,
      starts: '',
      ends: '',
    },
    {
      id: 'nl-season',
      text: 'Northern Lights season — book a private Aurora tour and your driver follows the forecast.',
      textIs: 'Norðurljósatímabilið er hafið — bókaðu einkaferð og bílstjórinn fylgir spánni.',
      linkLabel: 'Book a tour',
      linkUrl: '/tours/northern-lights',
      active: true,
      starts: '2025-01-01',
      ends: '2025-04-15',
    },
    {
      id: 'kef-flat',
      text: 'Fixed price from Keflavík Airport to Reykjavík, with flight tracking included.',
      textIs: 'Fast verð frá Keflavíkurflugvelli til Reykjavíkur, flugvakt innifalin.',
      linkLabel: '',
      linkUrl: '',
      active: true,
      starts: '',
      ends: '',
    },
    {
      id: 'easter',
      text: 'Easter weekend: book early — surcharges of 25% apply on public holidays.',
      textIs: 'Páskar: bókaðu tímanlega — 25% álag á almennum frídögum.',
      linkLabel: '',
      linkUrl: '',
      active: true,
      starts: '2025-04-01',
      ends: '2025-04-21',
    },
    {
      id: 'cruise',
      text: 'Cruise port transfers are back from May.',
      textIs: '',
      linkLabel: '',
      linkUrl: '',
      active: false,
      starts: '',
      ends: '',
    },
  ],
}

export type AnnouncementStatus = 'live' | 'scheduled' | 'expired' | 'off'

export function statusOf(a: Announcement, today = TODAY): AnnouncementStatus {
  if (!a.active) return 'off'
  if (a.starts && a.starts > today) return 'scheduled'
  if (a.ends && a.ends < today) return 'expired'
  return 'live'
}

/** What visitors actually see right now. */
export function visibleAnnouncements(state: AnnouncementState) {
  if (!state.settings.enabled) return []
  return state.items.filter((a) => statusOf(a) === 'live')
}

/** Seconds per loop, scaled to how much text there is so the reading pace stays constant. */
export function loopSeconds(chars: number, speed: BarSpeed) {
  const charsPerSecond = speed === 'slow' ? 9 : speed === 'fast' ? 20 : 14
  return Math.max(12, Math.round(chars / charsPerSecond))
}

export const BAR_STYLES: Record<BarStyle, { label: string; bar: string; link: string; dot: string }> = {
  navy: { label: 'Navy', bar: 'bg-navy text-white', link: 'text-primary', dot: 'bg-white/40' },
  yellow: { label: 'Yellow', bar: 'bg-primary text-on-primary', link: 'text-on-primary underline', dot: 'bg-on-primary/40' },
  mint: { label: 'Mint', bar: 'bg-mint text-navy', link: 'text-navy underline', dot: 'bg-navy/40' },
}

export const newAnnouncementId = () => `a-${Math.random().toString(36).slice(2, 8)}`
