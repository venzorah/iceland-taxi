import type { AnnouncementState, BarSpeed, BarStyle } from '@/lib/design/announcements'

export const OFFICIAL_COLORS = { navy: '#061B3A', yellow: '#FFC400', mint: '#00CFA5', cyan: '#00AEEF' }

export const STAFF_ROLES = ['SUPER_ADMIN', 'BOOKING_MANAGER', 'FINANCE_MANAGER', 'CONTENT_MANAGER', 'STAFF'] as const

export type AppearanceConfig = {
  navy: string
  yellow: string
  mint: string
  cyan: string
  light: boolean
  dark: boolean
  surfaces: Record<string, 'light' | 'dark'>
  defaultLang: 'en' | 'is'
}

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  ...OFFICIAL_COLORS,
  light: true,
  dark: true,
  surfaces: {
    'Public website': 'light',
    'Customer app': 'light',
    'Admin dashboard': 'light',
    'Driver portal': 'dark',
  },
  defaultLang: 'en',
}

export type AnnouncementBarConfig = {
  managed: boolean
  enabled: boolean
  speed: BarSpeed
  style: BarStyle
  pauseOnHover: boolean
}

type AnnouncementRow = {
  id: string
  textEn: string
  textIs: string | null
  href: string | null
  linkLabel: string | null
  enabled: boolean
  startsAt: Date | null
  endsAt: Date | null
}

function day(value: Date | null) {
  if (!value) return ''
  return value.toISOString().slice(0, 10)
}

function parseDay(value: string) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function appearanceFromJson(value: unknown): AppearanceConfig {
  const raw = value && typeof value === 'object' ? (value as Partial<AppearanceConfig>) : {}
  const surfaces = { ...DEFAULT_APPEARANCE.surfaces, ...(raw.surfaces || {}) }
  return {
    navy: typeof raw.navy === 'string' ? raw.navy : DEFAULT_APPEARANCE.navy,
    yellow: typeof raw.yellow === 'string' ? raw.yellow : DEFAULT_APPEARANCE.yellow,
    mint: typeof raw.mint === 'string' ? raw.mint : DEFAULT_APPEARANCE.mint,
    cyan: typeof raw.cyan === 'string' ? raw.cyan : DEFAULT_APPEARANCE.cyan,
    light: raw.light !== false,
    dark: raw.dark !== false,
    surfaces,
    defaultLang: raw.defaultLang === 'is' ? 'is' : 'en',
  }
}

export function barFromJson(value: unknown): AnnouncementBarConfig | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<AnnouncementBarConfig>
  if (!raw.managed) return null
  const speed: BarSpeed = raw.speed === 'slow' || raw.speed === 'fast' ? raw.speed : 'normal'
  const style: BarStyle = raw.style === 'yellow' || raw.style === 'mint' ? raw.style : 'navy'
  return {
    managed: true,
    enabled: raw.enabled !== false,
    speed,
    style,
    pauseOnHover: raw.pauseOnHover !== false,
  }
}

export function announcementsFromRows(rows: AnnouncementRow[], bar: AnnouncementBarConfig): AnnouncementState {
  return {
    settings: {
      enabled: bar.enabled,
      speed: bar.speed,
      style: bar.style,
      pauseOnHover: bar.pauseOnHover,
    },
    items: rows.map((row) => ({
      id: row.id,
      text: row.textEn,
      textIs: row.textIs || '',
      linkLabel: row.linkLabel || '',
      linkUrl: row.href || '',
      active: row.enabled,
      starts: day(row.startsAt),
      ends: day(row.endsAt),
    })),
  }
}

export function announcementWrites(state: AnnouncementState) {
  return state.items
    .filter((item) => item.text.trim())
    .map((item, index) => ({
      textEn: item.text.trim(),
      textIs: item.textIs.trim() || null,
      href: item.linkUrl.trim() || null,
      linkLabel: item.linkLabel.trim() || null,
      enabled: item.active,
      sortOrder: index,
      startsAt: parseDay(item.starts),
      endsAt: parseDay(item.ends),
    }))
}

export function barWrite(state: AnnouncementState): AnnouncementBarConfig {
  return { managed: true, ...state.settings }
}

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'item'
}
