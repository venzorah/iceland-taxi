import React, { useEffect, useState } from 'react'

import Homepage from '@os/sHZPt41ARsFZivbeVxeYHs'
import Booking from '@os/cJEowRay3UTeQ4emB6RLKW'
import CustomerDashboard from '@os/wLJ2Uoc9ViXbcsdvR9SXkN'
import AdminDashboard from '@os/7QmK5DJzqA1Jf2dQCon5ZZ'
import MobileAdmin from '@os/b3JSdMrR4RaHRxwmUg7746'
import DriverPortal from '@os/iqLyUuzHwrK4QMLFoUhKf9'
import { ANNOUNCEMENTS_SEED, type AnnouncementState } from '@shared/announcements'

type DemoPortal = { id: string; path: string }

const HOME = 'sHZPt41ARsFZivbeVxeYHs'
const BOOKING = 'cJEowRay3UTeQ4emB6RLKW'
const CUSTOMER = 'wLJ2Uoc9ViXbcsdvR9SXkN'
const ADMIN = '7QmK5DJzqA1Jf2dQCon5ZZ'
const MOBILE_ADMIN = 'b3JSdMrR4RaHRxwmUg7746'
const DRIVER = 'iqLyUuzHwrK4QMLFoUhKf9'

/** Each screen's shareable link on the deployed site, e.g. https://your-app.vercel.app/#/driver */
const PORTALS: DemoPortal[] = [
  { id: HOME, path: '/' },
  { id: BOOKING, path: '/book' },
  { id: CUSTOMER, path: '/account' },
  { id: DRIVER, path: '/driver' },
  { id: ADMIN, path: '/admin' },
  { id: MOBILE_ADMIN, path: '/admin/mobile' },
]

const screenFromHash = (): string | undefined => {
  if (typeof window === 'undefined') return undefined
  const path = window.location.hash.replace(/^#/, '') || '/'
  return PORTALS.find((p) => p.path === path)?.id
}

/** Sync with the URL only on the deployed site, never inside the canvas's own preview frames. */
const isStandalone = () => {
  try {
    return typeof window !== 'undefined' && window.self === window.top
  } catch {
    return false
  }
}

/** The size every frame draws at, unless one exports its own. */
export const viewport = 'web'

export const folders = [
  { id: 'customer', name: 'Public Website & Booking', frames: [HOME, BOOKING] },
  { id: 'customer-account', name: 'Customer Account', frames: [CUSTOMER] },
  { id: 'operations', name: 'Administration (Desktop & Mobile)', frames: [ADMIN, MOBILE_ADMIN] },
  { id: 'driver', name: 'Driver Portal', frames: [DRIVER] },
]

export const args = {
  theme: 'light',
  language: 'en',
  customerCategory: 'international',
}

export const argTypes = {
  theme: { control: 'radio', options: ['light', 'dark'] },
  language: { control: 'radio', options: ['en', 'is'] },
  customerCategory: { control: 'radio', options: ['international', 'resident'] },
}

type Props = Partial<typeof args> & { start?: string }

export default function IcelandTaxiBooking(props: Props) {
  const p = { ...args, ...props }
  const routed = !p.start && isStandalone()
  const [screen, setScreen] = useState(() => p.start ?? (routed ? screenFromHash() : undefined) ?? HOME)
  const [theme, setTheme] = useState(p.theme as 'light' | 'dark')
  const [language, setLanguage] = useState(p.language as 'en' | 'is')
  const [currency, setCurrency] = useState<'USD' | 'ISK'>(p.customerCategory === 'resident' ? 'ISK' : 'USD')
  const [search, setSearch] = useState({ pickup: 'Keflavík Airport (KEF)', destination: 'Reykjavík city centre', date: '2025-03-14', time: '15:30', passengers: 2 })
  const [payState, setPayState] = useState<'default' | 'paying' | 'confirmed'>('default')
  const [adminSection, setAdminSection] = useState('overview')
  const [announcements, setAnnouncements] = useState<AnnouncementState>(ANNOUNCEMENTS_SEED)

  useEffect(() => setTheme(p.theme as 'light' | 'dark'), [p.theme])
  useEffect(() => setLanguage(p.language as 'en' | 'is'), [p.language])
  useEffect(() => setCurrency(p.customerCategory === 'resident' ? 'ISK' : 'USD'), [p.customerCategory])

  // Keep the address bar and the back button in step with the screen on the deployed site.
  useEffect(() => {
    if (!routed) return
    const path = PORTALS.find((x) => x.id === screen)?.path ?? '/'
    const current = window.location.hash.replace(/^#/, '') || '/'
    if (current !== path) window.location.hash = path
    window.scrollTo(0, 0)
  }, [screen, routed])

  useEffect(() => {
    if (!routed) return
    const onHash = () => {
      const next = screenFromHash()
      if (next) setScreen(next)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [routed])

  const shared = { theme, language, onThemeChange: setTheme, onLanguageChange: setLanguage, onCurrencyChange: setCurrency, announcements }
  const adminAnn = { announcements, onAnnouncementsChange: setAnnouncements }
  const goHome = () => {
    setPayState('default')
    setScreen(HOME)
  }
  const startBooking = () => {
    setPayState('default')
    setScreen(BOOKING)
  }

  return renderScreen()

  function renderScreen() {
  switch (screen) {
    case BOOKING:
      return (
        <Booking
          {...shared}
          {...search}
          currency={currency}
          customerCategory={p.customerCategory}
          state={payState}
          onBack={goHome}
          onPay={() => {
            setPayState('paying')
            setTimeout(() => setPayState('confirmed'), 900)
          }}
        />
      )
    case CUSTOMER:
      return <CustomerDashboard {...shared} currency={currency} onHome={goHome} onBook={startBooking} />
    case ADMIN:
      return <AdminDashboard theme={theme} onThemeChange={setTheme} section={adminSection} onSectionChange={setAdminSection} onViewSite={goHome} {...adminAnn} />
    case MOBILE_ADMIN:
      return <MobileAdmin theme={theme} onThemeChange={setTheme} onOpenDesktop={() => setScreen(ADMIN)} onViewSite={goHome} {...adminAnn} />
    case DRIVER:
      return <DriverPortal theme={theme} onThemeChange={setTheme} onViewSite={goHome} />
    default:
      return (
        <Homepage
          {...shared}
          currency={currency}
          onSignIn={() => setScreen(CUSTOMER)}
          onStaff={() => setScreen(ADMIN)}
          onStaffMobile={() => setScreen(MOBILE_ADMIN)}
          onDriver={() => setScreen(DRIVER)}
          onSearch={(s) => {
            setSearch({
              pickup: s.pickup,
              destination: s.destination,
              date: s.date || '2025-03-14',
              time: s.time || '15:30',
              passengers: s.passengers,
            })
            startBooking()
          }}
        />
      )
  }
  }
}
