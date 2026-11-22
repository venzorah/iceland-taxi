'use client'

import dynamic from 'next/dynamic'
import React, { useState } from 'react'
import { Menu, Moon, Plus, Sun, Search } from 'lucide-react'

import { AdminProfileMenu } from '@/components/admin/AdminProfileMenu'
import { AdminModal, AdminEmpty } from '@/components/admin/AdminUI'
import { useSiteSession } from '@/components/providers/SessionProvider'
import { canViewAdminSection, initialAdminSection } from '@/lib/auth/admin-sections'
import { BottomSheet } from '@/components/site/BottomSheet'
import { MobileNav, Sidebar } from './Sidebar'
import { Overview } from './Overview'
import { BookingsTable } from './BookingsTable'
import { Appearance } from './Appearance'
import { Services } from './Services'
import { Pricing } from './Pricing'
import { Routes } from './Routes'
const PaymentsList = dynamic(() => import('./PaymentsList').then(module => module.PaymentsList), { loading: () => <p role="status" className="p-6 text-muted">Loading…</p> })
const Messages = dynamic(() => import('./Messages').then(module => module.Messages), { loading: () => <p role="status" className="p-6 text-muted">Loading…</p> })
import { StaffNoticeBell } from './StaffNoticeBell'
const Fleet = dynamic(() => import('./Fleet').then(module => module.Fleet), { loading: () => <p role="status" className="p-6 text-muted">Loading…</p> })
import { Seo } from './Seo'
import { Staff } from './Staff'
import { AnnouncementsManager } from '@/components/site/AnnouncementsManager'
import { ANNOUNCEMENTS_SEED, type AnnouncementState } from '@/lib/design/announcements'
const CustomersSection = dynamic(() => import('./Workspace').then(module => module.CustomersSection), { loading: () => <p role="status" className="p-6 text-muted">Loading…</p> })
const DestinationsSection = dynamic(() => import('./Workspace').then(module => module.DestinationsSection), { loading: () => <p role="status" className="p-6 text-muted">Loading…</p> })
const LanguagesSection = dynamic(() => import('./Workspace').then(module => module.LanguagesSection), { loading: () => <p role="status" className="p-6 text-muted">Loading…</p> })
const PagesSection = dynamic(() => import('./Workspace').then(module => module.PagesSection), { loading: () => <p role="status" className="p-6 text-muted">Loading…</p> })
const ReportsSection = dynamic(() => import('./Workspace').then(module => module.ReportsSection), { loading: () => <p role="status" className="p-6 text-muted">Loading…</p> })
const ReviewsSection = dynamic(() => import('./Workspace').then(module => module.ReviewsSection), { loading: () => <p role="status" className="p-6 text-muted">Loading…</p> })
const SettingsSection = dynamic(() => import('./Workspace').then(module => module.SettingsSection), { loading: () => <p role="status" className="p-6 text-muted">Loading…</p> })
import { ImageLibrary } from './ImageLibrary'
import { WebsiteContent } from './WebsiteContent'
import { ContactMessages } from './ContactMessages'
import { Enquiries } from './Enquiries'

export const args = {
  section: 'overview',
  theme: 'light',
  role: 'Super Admin',
}

export const argTypes = {
  section: { control: 'select', options: ['overview', 'bookings', 'messages', 'services', 'pricing', 'routes', 'payments', 'drivers', 'vehicles', 'announcements', 'seo', 'staff', 'appearance'] },
  theme: { control: 'radio', options: ['light', 'dark'] },
  role: { control: 'select', options: ['Super Admin', 'Booking Manager', 'Finance Manager', 'Content Manager'] },
}

type Props = Partial<typeof args> & {
  onThemeChange?: (t: 'light' | 'dark') => void
  onSectionChange?: (s: string) => void
  onViewSite?: () => void
  /** The site's announcement bar. When the prototype passes these, edits here show on the public site. */
  announcements?: AnnouncementState
  onAnnouncementsChange?: (next: AnnouncementState) => void | Promise<void>
}

export default function AdminDashboard(props: Props) {
  const { user } = useSiteSession()
  const p = { ...args, ...props, role: user?.role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) || 'Staff' }
  const [localSection, setLocalSection] = useState(p.section)
  const requestedSection = props.onSectionChange ? p.section : localSection
  const section = user && canViewAdminSection(user.role, requestedSection) ? requestedSection : initialAdminSection(user?.role || '')
  const go = (s: string) => (props.onSectionChange ? props.onSectionChange(s) : setLocalSection(s))
  const th = p.theme as 'light' | 'dark'
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [bookingSearch, setBookingSearch] = useState('')
  const [focusRef, setFocusRef] = useState<string | null>(null)
  const [localAnn, setLocalAnn] = useState<AnnouncementState>(ANNOUNCEMENTS_SEED)
  const announcements = props.onAnnouncementsChange ? props.announcements ?? ANNOUNCEMENTS_SEED : localAnn
  const setAnnouncements = props.onAnnouncementsChange ?? setLocalAnn

  const titles: Record<string, string> = {
    content: 'Website content', library: 'Image library', contacts: 'Contact messages', overview: 'Today', bookings: 'Bookings', enquiries: 'Enquiries', messages: 'Messages', services: 'Services', pricing: 'Pricing & currency', routes: 'Routes', payments: 'Payments & refunds', drivers: 'Drivers',
    vehicles: 'Vehicles', destinations: 'Destinations', customers: 'Customers', reports: 'Reports', reviews: 'Reviews', announcements: 'Announcements', pages: 'Pages & blog', seo: 'SEO & landing pages', languages: 'Languages', staff: 'Staff & permissions', appearance: 'Appearance & Theme', settings: 'System settings',
  }
  const body = (() => {
    switch (section) {
      case 'overview': return <Overview onOpenBookings={() => go('bookings')} />
      case 'bookings': return <BookingsTable searchQuery={bookingSearch} />
      case 'contacts': return <ContactMessages />
      case 'enquiries': return <Enquiries />
      case 'messages': return <Messages focusRef={focusRef} onOpenSettings={() => go('settings')} />
      case 'services': return <Services />
      case 'pricing': return <Pricing />
      case 'routes': return <Routes />
      case 'destinations': return <DestinationsSection />
      case 'customers': return <CustomersSection />
      case 'reports': return <ReportsSection />
      case 'reviews': return <ReviewsSection />
      case 'pages': return <PagesSection />
      case 'languages': return <LanguagesSection />
      case 'settings': return <SettingsSection />
      case 'payments': return <PaymentsList />
      case 'drivers': return <Fleet view="drivers" />
      case 'vehicles': return <Fleet view="vehicles" />
      case 'announcements': return <AnnouncementsManager value={announcements} onChange={setAnnouncements} />
      case 'content': return <WebsiteContent />
      case 'library': return <ImageLibrary />
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
      <div className="flex h-dvh overflow-hidden bg-surface font-sans text-text">
        <Sidebar active={section} role={p.role} onSelect={go} onViewSite={p.onViewSite} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-bg px-2 sm:h-20 sm:gap-4 sm:px-6">
            <button onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-heading active:bg-surface lg:hidden">
              <Menu size={21} />
            </button>
            <h1 className="min-w-0 truncate font-display text-base font-bold text-heading sm:text-lg">{titles[section] ?? section.charAt(0).toUpperCase() + section.slice(1)}</h1>
            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <form role="search" onSubmit={event => { event.preventDefault(); setSearchOpen(true) }} className="hidden items-center rounded-xl border border-line bg-input md:flex"><input type="search" aria-label="Search admin pages or bookings" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search admin…" className="w-36 rounded-l-xl bg-transparent px-3 py-2 text-sm text-heading outline-none lg:w-48" /><button type="submit" aria-label="Search admin" className="p-2 text-muted"><Search size={18} /></button></form><button type="button" onClick={() => setSearchOpen(true)} aria-label="Search admin" className="grid h-10 w-10 place-items-center rounded-xl text-heading md:hidden"><Search size={18} /></button>
              <AdminProfileMenu />
              <button onClick={() => p.onThemeChange?.(th === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" className="grid h-10 w-10 sm:h-9 sm:w-9 place-items-center rounded-lg text-heading transition-colors duration-150 hover:bg-surface">
                {th === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              {user && canViewAdminSection(user.role, 'messages') && <StaffNoticeBell
                onOpenChat={(ref) => {
                  setFocusRef(ref)
                  go('messages')
                }}
                onOpenSettings={() => go('settings')}
              />}
              {user && canViewAdminSection(user.role, 'bookings') && <a href="/book" className="hidden items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover sm:flex">
                <Plus size={16} /> New booking
              </a>}
            </div>
          </header>

          <main key={section} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {body}
          </main>
        </div>
      </div>

      {searchOpen && <AdminModal title="Search admin" onClose={() => setSearchOpen(false)}><label className="block text-sm font-semibold">Find a page or booking<input autoFocus type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Services, vehicles, booking reference…" className="mt-2 w-full rounded-xl border border-line bg-input px-4 py-3 text-heading" /></label><ul className="mt-4 space-y-1">{Object.entries(titles).filter(([id, title]) => user && canViewAdminSection(user.role, id) && title.toLowerCase().includes(search.toLowerCase())).map(([id, title]) => <li key={id}><button type="button" onClick={() => { go(id); setSearchOpen(false); setSearch('') }} className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold hover:bg-surface">{title}</button></li>)}</ul>{search.trim() && user && canViewAdminSection(user.role, 'bookings') && <button type="button" onClick={() => { setBookingSearch(search.trim()); go('bookings'); setSearchOpen(false); setSearch('') }} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary">Search bookings for “{search.trim()}”</button>}{!Object.entries(titles).some(([id, title]) => user && canViewAdminSection(user.role, id) && title.toLowerCase().includes(search.toLowerCase())) && <AdminEmpty title="No matching pages" description="Try another page name, or search by booking reference, customer or route." />}</AdminModal>}
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
