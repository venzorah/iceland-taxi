import React, { useState } from 'react'
import { Bell, Menu, Moon, Plus, Search, Sun } from 'lucide-react'

import { BottomSheet } from '@shared/components/BottomSheet'
import { MobileNav, Sidebar } from './components/Sidebar'
import { Overview } from './components/Overview'
import { BookingsTable } from './components/BookingsTable'
import { Appearance } from './components/Appearance'
import { Services } from './components/Services'
import { Pricing } from './components/Pricing'
import { Routes } from './components/Routes'
import { Fleet } from './components/Fleet'
import { Seo } from './components/Seo'
import { Staff } from './components/Staff'
import { AnnouncementsManager } from '@shared/components/AnnouncementsManager'
import { ANNOUNCEMENTS_SEED, type AnnouncementState } from '@shared/announcements'

export const args = {
  section: 'overview',
  theme: 'light',
  role: 'Super Admin',
}

export const argTypes = {
  section: { control: 'select', options: ['overview', 'bookings', 'services', 'pricing', 'routes', 'drivers', 'vehicles', 'announcements', 'seo', 'staff', 'appearance'] },
  theme: { control: 'radio', options: ['light', 'dark'] },
  role: { control: 'select', options: ['Super Admin', 'Booking Manager', 'Finance Manager', 'Content Manager'] },
}

type Props = Partial<typeof args> & {
  onThemeChange?: (t: 'light' | 'dark') => void
  onSectionChange?: (s: string) => void
  onViewSite?: () => void
  /** The site's announcement bar. When the prototype passes these, edits here show on the public site. */
  announcements?: AnnouncementState
  onAnnouncementsChange?: (next: AnnouncementState) => void
}

export default function AdminDashboard(props: Props) {
  const p = { ...args, ...props }
  const [localSection, setLocalSection] = useState(p.section)
  const section = props.onSectionChange ? p.section : localSection
  const go = (s: string) => (props.onSectionChange ? props.onSectionChange(s) : setLocalSection(s))
  const th = p.theme as 'light' | 'dark'
  const [menuOpen, setMenuOpen] = useState(false)
  const [localAnn, setLocalAnn] = useState<AnnouncementState>(ANNOUNCEMENTS_SEED)
  const announcements = props.onAnnouncementsChange ? props.announcements ?? ANNOUNCEMENTS_SEED : localAnn
  const setAnnouncements = props.onAnnouncementsChange ?? setLocalAnn

  const titles: Record<string, string> = {
    overview: 'Today', bookings: 'Bookings', services: 'Services', pricing: 'Pricing & currency', routes: 'Routes', drivers: 'Drivers',
    vehicles: 'Vehicles', announcements: 'Announcements', seo: 'SEO & landing pages', staff: 'Staff & permissions', appearance: 'Appearance & Theme',
  }
  const body = (() => {
    switch (section) {
      case 'overview': return <Overview onOpenBookings={() => go('bookings')} />
      case 'bookings': return <BookingsTable />
      case 'services': return <Services />
      case 'pricing': return <Pricing />
      case 'routes': return <Routes />
      case 'drivers': return <Fleet view="drivers" />
      case 'vehicles': return <Fleet view="vehicles" />
      case 'announcements': return <AnnouncementsManager value={announcements} onChange={setAnnouncements} />
      case 'seo': return <Seo />
      case 'staff': return <Staff />
      case 'appearance': return <Appearance />
      default:
        return (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <p className="font-display text-lg font-bold text-heading">This section isn't designed yet</p>
              <p className="mt-1 text-sm text-muted">It's on the list for the next round of screens.</p>
            </div>
          </div>
        )
    }
  })()

  return (
    <div className={th === 'dark' ? 'dark' : ''}>
      <div className="flex h-screen overflow-hidden bg-surface font-sans text-text">
        <Sidebar active={section} role={p.role} onSelect={go} onViewSite={p.onViewSite} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-bg px-2 sm:h-20 sm:gap-4 sm:px-6">
            <button onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-heading active:bg-surface lg:hidden">
              <Menu size={21} />
            </button>
            <h1 className="min-w-0 truncate font-display text-base font-bold text-heading sm:text-lg">{titles[section] ?? section.charAt(0).toUpperCase() + section.slice(1)}</h1>
            <div className="ml-4 hidden max-w-md flex-1 items-center gap-2 rounded-lg border border-input-line bg-input px-3 py-2 md:flex">
              <Search size={15} className="text-muted" />
              <input placeholder="Search bookings, customers, references…" className="w-full bg-transparent text-sm text-heading outline-none placeholder:text-muted" />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <button aria-label="Search" className="grid h-10 w-10 place-items-center rounded-lg text-heading active:bg-surface md:hidden">
                <Search size={18} />
              </button>
              <button onClick={() => p.onThemeChange?.(th === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" className="grid h-10 w-10 sm:h-9 sm:w-9 place-items-center rounded-lg text-heading transition-colors duration-150 hover:bg-surface">
                {th === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button aria-label="Notifications" className="relative grid h-10 w-10 sm:h-9 sm:w-9 place-items-center rounded-lg text-heading transition-colors duration-150 hover:bg-surface">
                <Bell size={17} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
              </button>
              <button className="hidden items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover sm:flex">
                <Plus size={16} /> New booking
              </button>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            {body}
          </main>
        </div>
      </div>

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Admin menu" hideFrom="lg">
        <MobileNav
          active={section}
          role={p.role}
          onSelect={(s) => {
            setMenuOpen(false)
            go(s)
          }}
          onViewSite={() => {
            setMenuOpen(false)
            p.onViewSite?.()
          }}
        />
      </BottomSheet>
    </div>
  )
}
