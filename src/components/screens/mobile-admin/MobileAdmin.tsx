'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3, Car, ChevronRight, CreditCard, FileText, Globe, Home, LayoutGrid, MapPinned, MessageSquare, Moon, Palette, Plus, Route, Search,
  Settings, Shield, Star, Sun, Tag, UserSquare2, Users, CalendarCheck, Send, Megaphone, ChevronLeft, Images,
} from 'lucide-react'

import { MessageAlertControl, useArmMessageSoundOnPointer } from '@/components/alerts/MessageAlerts'
import { ReadBadge } from '@/components/messages/ReadBadge'
import { rememberAlertAudience } from '@/lib/alerts/client'
import { markThreadOpen } from '@/lib/messaging/read-state'
import { staffMessageNotice, whatsappHref } from '@/lib/whatsapp'
import { StaffNoticeBell } from '@/components/screens/admin/StaffNoticeBell'
import { AnnouncementsManager } from '@/components/site/AnnouncementsManager'
import { ANNOUNCEMENTS_SEED, visibleAnnouncements, type AnnouncementState } from '@/lib/design/announcements'

import { usePublishedListings } from '@/components/booking/usePublishedListings'
import { listingLabel } from '@/lib/booking/listings'
import { formatIsk } from '@/lib/design/data'
import { Enquiries } from '@/components/screens/admin/Enquiries'
import { Appearance } from '@/components/screens/admin/Appearance'
import { Fleet } from '@/components/screens/admin/Fleet'
import { PaymentsList } from '@/components/screens/admin/PaymentsList'
import { Pricing } from '@/components/screens/admin/Pricing'
import { Routes } from '@/components/screens/admin/Routes'
import { Seo } from '@/components/screens/admin/Seo'
import { Staff } from '@/components/screens/admin/Staff'
import { ImageLibrary } from '@/components/screens/admin/ImageLibrary'
import { WebsiteContent } from '@/components/screens/admin/WebsiteContent'
import { CustomersSection, DestinationsSection, LanguagesSection, PagesSection, ReportsSection, ReviewsSection, SettingsSection } from '@/components/screens/admin/Workspace'
import { LOGO_DARK, LOGO_LIGHT } from '@/lib/design/data'
import { money, statusClass, type OpsBooking } from '@/lib/design/opsData'
import { signOutToHome } from '@/lib/auth/sign-out'
import { LogOut } from 'lucide-react'
import { AdminProfileMenu } from '@/components/admin/AdminProfileMenu'
import { AdminButton, AdminForm, AdminModal, AdminToggle } from '@/components/admin/AdminUI'
import { Services } from '@/components/screens/admin/Services'

export const viewport = 'mobile'

export const args = {
  tab: 'home',
  theme: 'light',
}

export const argTypes = {
  tab: { control: 'select', options: ['home', 'bookings', 'messages', 'services', 'more'] },
  theme: { control: 'radio', options: ['light', 'dark'] },
}

type Props = Partial<typeof args> & {
  onThemeChange?: (t: 'light' | 'dark') => void
  onOpenDesktop?: () => void
  onViewSite?: () => void
  announcements?: AnnouncementState
  onAnnouncementsChange?: (next: AnnouncementState) => void | Promise<void>
}

type DriverOption = { id: string; displayName: string; status: string }

const STATUS_TO_API: Record<string, string> = {
  Pending: 'PENDING',
  'Awaiting Payment': 'AWAITING_PAYMENT',
  Confirmed: 'CONFIRMED',
  'Driver Assigned': 'DRIVER_ASSIGNED',
  Acknowledged: 'ACKNOWLEDGED',
  'Driver En Route': 'DRIVER_EN_ROUTE',
  'In Progress': 'IN_PROGRESS',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
  'Refund Requested': 'REFUND_REQUESTED',
  Refunded: 'REFUNDED',
}

export default function MobileAdmin(props: Props) {
  const p = { ...args, ...props }
  const [tab, setTab] = useState(p.tab)
  const [searchOpen, setSearchOpen] = useState(false)
  const [bookingSearch, setBookingSearch] = useState('')
  const [sheet, setSheet] = useState<OpsBooking | null>(null)
  const [chat, setChat] = useState<string | null>(null)
  const th = p.theme as 'light' | 'dark'
  const [page, setPage] = useState<'announcements' | 'payments' | 'drivers' | 'vehicles' | 'customers' | 'reports' | 'reviews' | 'pages' | 'seo' | 'languages' | 'staff' | 'appearance' | 'settings' | 'destinations' | 'routes' | 'pricing' | 'enquiries' | 'content' | 'library' | null>(null)
  const [localAnn, setLocalAnn] = useState<AnnouncementState>(ANNOUNCEMENTS_SEED)
  const announcements = props.onAnnouncementsChange ? props.announcements ?? ANNOUNCEMENTS_SEED : localAnn
  const setAnnouncements = props.onAnnouncementsChange ?? setLocalAnn

  const [bookings, setBookings] = useState<OpsBooking[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [source, setSource] = useState('loading')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [compose, setCompose] = useState(false)
  const {listings} = usePublishedListings()
  const [bookingDraft, setBookingDraft] = useState({ guestName: '', guestEmail: '', listingId: '' })
  const selectedListing = (listings || []).find((listing) => listing.id === bookingDraft.listingId) || null
  const [driverId, setDriverId] = useState('')
  const [statusDraft, setStatusDraft] = useState<OpsBooking['status']>('Confirmed')

  const load = useCallback(async () => {
    try {
      const [bRes, dRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/drivers'),
      ])
      const bJson = await bRes.json()
      const dJson = await dRes.json()
      const ops: OpsBooking[] = bJson.ops || bJson.bookings || []
      setBookings(ops)
      setSource(bJson.source || 'unknown')
      setDrivers(
        (dJson.drivers || []).map((d: { id?: string; displayName?: string; name?: string; status?: string }) => ({
          id: d.id || d.displayName || d.name || '',
          displayName: d.displayName || d.name || 'Driver',
          status: d.status || 'Available',
        })),
      )
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!sheet) return
    setStatusDraft(sheet.status)
    const match = drivers.find((d) => d.displayName === sheet.driver)
    setDriverId(match?.id || '')
    setSaveMsg(null)
  }, [sheet, drivers])

  const saveBooking = async (patch: { status?: string; driverId?: string | null }) => {
    if (!sheet) return
    setSaveMsg(null)
    const res = await fetch(`/api/bookings/${sheet.ref}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        status: patch.status ? STATUS_TO_API[patch.status] || patch.status : undefined,
        driverId: patch.driverId,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      setSaveMsg(data.message || 'Could not save')
      return
    }
    setSaveMsg('Saved')
    await load()
    if (data.ops) setSheet(data.ops)
  }

  const NAV = [
    ['home', 'Home', Home],
    ['bookings', 'Bookings', CalendarCheck],
    ['messages', 'Messages', MessageSquare],
    ['services', 'Services', Tag],
    ['more', 'More', LayoutGrid],
  ] as const

  return (
    <div className={th === 'dark' ? 'dark' : ''}>
      <div className="relative mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-surface font-sans text-text">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg px-4">
          <img src={th === 'dark' ? LOGO_DARK : LOGO_LIGHT} alt="Iceland Taxi Booking" className="h-12 w-auto" />
          <div className="ml-auto flex items-center gap-1">
            <AdminProfileMenu />
            <AdminButton type="button" aria-label="Search bookings" onClick={() => setSearchOpen(true)} className="grid h-10 w-10 place-items-center rounded-full text-heading"><Search size={19} /></AdminButton>
            <StaffNoticeBell
              onOpenChat={(ref) => { setPage(null); setTab('messages'); setChat(ref) }}
              onOpenSettings={() => { setTab('more'); setPage('settings') }}
            />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pb-24">
          {tab === 'home' && <HomeTab bookings={bookings} source={source} onOpen={setSheet} onTab={setTab} onEnquiries={() => setPage('enquiries')} />}
          {tab === 'bookings' && <BookingsTab bookings={bookings} onOpen={setSheet} searchQuery={bookingSearch} />}
          {tab === 'messages' && <MessagesTab chat={chat} setChat={setChat} />}
          {tab === 'services' && <Services />}
          {tab === 'more' && (
            <MoreTab
              theme={th}
              onThemeChange={p.onThemeChange}
              onOpenDesktop={p.onOpenDesktop}
              liveAnnouncements={visibleAnnouncements(announcements).length}
              onOpenAnnouncements={() => setPage('announcements')}
              onOpenPayments={() => setPage('payments')}
              onOpenPage={setPage}
            />
          )}
        </main>

        {page === 'announcements' && (
          <div className="absolute inset-0 z-[60] flex flex-col bg-surface">
            <header className="flex h-16 shrink-0 items-center gap-1 border-b border-line bg-bg px-2">
              <AdminButton onClick={() => setPage(null)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full text-heading active:bg-surface"><ChevronLeft size={22} /></AdminButton>
              <h1 className="font-display text-base font-bold text-heading">Announcements</h1>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AnnouncementsManager compact value={announcements} onChange={setAnnouncements} />
            </div>
          </div>
        )}

        {page && page !== 'announcements' && page !== 'payments' && (
          <div className="absolute inset-0 z-[60] flex flex-col bg-surface">
            <header className="flex h-16 shrink-0 items-center gap-1 border-b border-line bg-bg px-2">
              <AdminButton onClick={() => setPage(null)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full text-heading active:bg-surface"><ChevronLeft size={22} /></AdminButton>
              <h1 className="font-display text-base font-bold text-heading">{MORE_TITLES[page]}</h1>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {page === 'drivers' && <Fleet view="drivers" />}
              {page === 'vehicles' && <Fleet view="vehicles" />}
              {page === 'customers' && <CustomersSection />}
              {page === 'reports' && <ReportsSection />}
              {page === 'reviews' && <ReviewsSection />}
              {page === 'destinations' && <DestinationsSection />}
              {page === 'pages' && <PagesSection />}
              {page === 'seo' && <Seo />}
              {page === 'languages' && <LanguagesSection />}
              {page === 'staff' && <Staff />}
              {page === 'appearance' && <Appearance />}
              {page === 'settings' && <SettingsSection />}
              {page === 'enquiries' && <Enquiries />}
              {page === 'routes' && <Routes />}
              {page === 'pricing' && <Pricing />}
              {page === 'content' && <WebsiteContent />}
              {page === 'library' && <ImageLibrary />}
            </div>
          </div>
        )}

        {page === 'payments' && (
          <div className="absolute inset-0 z-[60] flex flex-col bg-surface">
            <header className="flex h-16 shrink-0 items-center gap-1 border-b border-line bg-bg px-2">
              <AdminButton onClick={() => setPage(null)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full text-heading active:bg-surface"><ChevronLeft size={22} /></AdminButton>
              <h1 className="font-display text-base font-bold text-heading">Payments</h1>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PaymentsList />
            </div>
          </div>
        )}

        {tab === 'bookings' && compose && (
          <AdminModal title="New booking" onClose={() => setCompose(false)}><AdminForm
            onSubmit={async (event) => {
              event.preventDefault()
              if (!selectedListing) {
                setSaveMsg('This option is unavailable')
                return
              }
              const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  guestName: bookingDraft.guestName,
                  guestEmail: bookingDraft.guestEmail,
                  listingId: selectedListing.id,
                  listingKind: selectedListing.kind,
                  serviceLabel: selectedListing.title,
                  routeLabel: listingLabel(selectedListing),
                  quote: { customerCategory: 'INTERNATIONAL', currency: 'EUR' },
                  awaitPaymentWithoutGateway: true,
                }),
              })
              const data = await res.json().catch(() => null)
              if (!res.ok || !data?.ok) {
                setSaveMsg(data?.message || 'Could not save the booking')
                return
              }
              setCompose(false)
              setBookingDraft({ guestName: '', guestEmail: '', listingId: '' })
              setSaveMsg('Saved')
              await load()
            }}
            className="grid gap-3"
          >
            <input required value={bookingDraft.guestName} onChange={(event) => setBookingDraft({ ...bookingDraft, guestName: event.target.value })} placeholder="Guest name" className="rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted" />
            <input required type="email" value={bookingDraft.guestEmail} onChange={(event) => setBookingDraft({ ...bookingDraft, guestEmail: event.target.value })} placeholder="Email" className="rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted" />
            <select required value={bookingDraft.listingId} onChange={(event) => setBookingDraft({ ...bookingDraft, listingId: event.target.value })} className="rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none">
              <option value="">Choose a published listing</option>
              {(listings || []).map((listing) => (
                <option key={listing.id} value={listing.id}>{listingLabel(listing)}</option>
              ))}
            </select>
            <p className="text-xs font-semibold text-heading">{selectedListing ? `Fixed price ${formatIsk(selectedListing.fromIsk)}` : 'This option is unavailable'}</p>
            <AdminButton type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary">Save booking</AdminButton>
          {saveMsg && <p role="status" className="text-sm text-heading">{saveMsg}</p>}</AdminForm></AdminModal>
        )}
        {tab === 'bookings' && (
          <AdminButton aria-label="New booking" onClick={() => setCompose((value) => !value)} className="absolute bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-on-primary shadow-lg transition-transform duration-150 active:scale-95">
            <Plus size={24} />
          </AdminButton>
        )}

        <nav className="absolute inset-x-0 bottom-0 grid grid-cols-5 border-t border-line bg-bg pb-5 pt-2">
          {NAV.map(([id, label, Icon]) => {
            const on = tab === id
            return (
              <AdminButton key={id} onClick={() => { setTab(id); setChat(null) }} className="relative flex flex-col items-center gap-1 py-1">
                <Icon size={21} className={on ? 'text-heading' : 'text-muted'} strokeWidth={on ? 2.4 : 2} />
                <span className={`text-[11px] ${on ? 'font-bold text-heading' : 'font-medium text-muted'}`}>{label}</span>
              </AdminButton>
            )
          })}
        </nav>

        {searchOpen && <AdminModal title="Search bookings" onClose={() => setSearchOpen(false)}><form onSubmit={event => { event.preventDefault(); setPage(null); setTab('bookings'); setSearchOpen(false) }}><label className="text-sm font-semibold">Reference, customer or route<input autoFocus value={bookingSearch} onChange={event => setBookingSearch(event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-input px-3 py-3" /></label><AdminButton type="submit" className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary">Search bookings</AdminButton></form></AdminModal>}
        <Sheet open={!!sheet} onClose={() => setSheet(null)}>
          {sheet && (
            <>
              <p className="font-mono text-xs text-muted">{sheet.ref}</p>
              <h2 className="mt-1 font-display text-xl font-bold text-heading">{sheet.route}</h2>
              <p className="mt-1 text-sm text-muted">{sheet.time} · {sheet.customer} · {sheet.pax} pax · {sheet.vehicle}</p>
              <span className={`mt-3 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(sheet.status)}`}>{sheet.status}</span>
              {saveMsg && <p className="mt-2 text-xs text-muted">{saveMsg}</p>}
              <p className="mt-5 text-xs font-semibold text-muted">Status</p>
              <select
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value as OpsBooking['status'])}
                className="mt-2 w-full rounded-xl border border-input-line bg-input px-4 py-3 text-sm font-semibold text-heading"
              >
                {['Pending', 'Awaiting Payment', 'Confirmed', 'Driver Assigned', 'Acknowledged', 'Driver En Route', 'In Progress', 'Completed', 'Cancelled', 'Refund Requested', 'Refunded'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <p className="mt-5 text-xs font-semibold text-muted">Assign driver</p>
              <div className="mt-2 space-y-2">
                {drivers.map((d) => (
                  <label key={d.id} className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
                    <input
                      type="radio"
                      name="driver"
                      checked={driverId === d.id}
                      onChange={() => setDriverId(d.id)}
                      disabled={d.status === 'Off duty'}
                      className="h-4 w-4 accent-[var(--navy)] dark:accent-[var(--primary)]"
                    />
                    <span className="flex-1 text-sm font-semibold text-heading">{d.displayName}</span>
                    <span className="text-xs text-muted">{d.status}</span>
                  </label>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <AdminButton
                  onClick={() => saveBooking({ status: 'Cancelled', driverId: driverId || null })}
                  className="rounded-xl border border-line py-3.5 text-sm font-semibold text-error"
                >
                  Cancel booking
                </AdminButton>
                <AdminButton
                  onClick={() => saveBooking({ status: statusDraft, driverId: driverId || null })}
                  className="rounded-xl bg-primary py-3.5 text-sm font-bold text-on-primary"
                >
                  Save
                </AdminButton>
              </div>
            </>
          )}
        </Sheet>


      </div>
    </div>
  )
}

function HomeTab({ bookings, source, onOpen, onTab, onEnquiries }: { bookings: OpsBooking[]; source: string; onOpen: (b: OpsBooking) => void; onTab: (t: string) => void; onEnquiries: () => void }) {
  const unassigned = bookings.filter((b) => !b.driver && b.status !== 'Pending' && b.status !== 'Cancelled')
  const upcoming = [...bookings].filter((b) => b.time !== '—' && b.status !== 'Completed' && b.status !== 'Cancelled').sort((a, b) => a.time.localeCompare(b.time))
  const usd = bookings.filter((b) => b.currency === 'USD').reduce((s, b) => s + b.amount, 0)
  const isk = bookings.filter((b) => b.currency === 'ISK').reduce((s, b) => s + b.amount, 0)
  return (
    <div className="space-y-5 p-4">
      <div>
        <p className="text-sm text-muted">Live ops · {source}</p>
        <h1 className="font-display text-2xl font-bold text-heading">Good afternoon</h1>
      </div>

      {unassigned[0] ? (
        <AdminButton onClick={() => onOpen(unassigned[0])} className="flex w-full items-center gap-4 rounded-2xl bg-navy p-4 text-left text-white">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-extrabold text-navy">{unassigned.length}</div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Journeys need a driver</p>
            <p className="truncate text-sm text-white/70">Next: {unassigned[0].time} · {unassigned[0].route}</p>
          </div>
          <ChevronRight size={18} className="text-white/60" />
        </AdminButton>
      ) : (
        <div className="rounded-2xl border border-line bg-bg p-4 text-sm text-muted">All assigned journeys have a driver.</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-bg p-4">
          <p className="text-xs text-muted">Bookings · USD</p>
          <p className="font-display text-xl font-extrabold text-heading">${usd.toLocaleString('en-US')}</p>
        </div>
        <div className="rounded-2xl border border-line bg-bg p-4">
          <p className="text-xs text-muted">Bookings · ISK</p>
          <p className="font-display text-xl font-extrabold text-heading">ISK {isk.toLocaleString('en-US')}</p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-heading">Custom enquiries</h2>
          <AdminButton onClick={onEnquiries} className="text-sm font-semibold text-link">See all</AdminButton>
        </div>
        <div className="mt-3">
          <Enquiries compact limit={3} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-heading">Coming up</h2>
          <AdminButton onClick={() => onTab('bookings')} className="text-sm font-semibold text-link">See all</AdminButton>
        </div>
        <div className="mt-3 space-y-2">
          {upcoming.slice(0, 4).map((b) => <BookingRow key={b.ref} b={b} onOpen={onOpen} />)}
          {upcoming.length === 0 && <p className="py-6 text-center text-sm text-muted">No upcoming bookings.</p>}
        </div>
      </section>
    </div>
  )
}

function BookingsTab({ bookings, onOpen, searchQuery = '' }: { bookings: OpsBooking[]; onOpen: (b: OpsBooking) => void; searchQuery?: string }) {
  const [search, setSearch] = useState(searchQuery)
  useEffect(() => { setSearch(searchQuery) }, [searchQuery])
  const [f, setF] = useState('Today')
  const filtered = useMemo(
    () =>
      bookings.filter(b => `${b.ref} ${b.customer} ${b.route}`.toLowerCase().includes(search.toLowerCase())).filter((b) =>
        f === 'Needs driver'
          ? !b.driver && b.status !== 'Pending'
          : f === 'Unpaid'
            ? b.status === 'Awaiting Payment'
            : f === 'Quotes'
              ? b.status === 'Pending'
              : f === 'Tomorrow' || f === 'Today'
                ? !!b.pickupAt && new Date(b.pickupAt).toLocaleDateString('en-CA', { timeZone: 'Atlantic/Reykjavik' }) === new Date(Date.now() + (f === 'Tomorrow' ? 86400000 : 0)).toLocaleDateString('en-CA', { timeZone: 'Atlantic/Reykjavik' })
                : true,
      ),
    [bookings, f, search],
  )
  return (
    <div className="p-4"><label className="mb-4 block text-sm font-semibold text-heading">Search bookings<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Reference, customer or route" className="mt-2 w-full rounded-xl border border-line bg-input px-3 py-2.5 text-heading" /></label>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {['All', 'Today', 'Needs driver', 'Unpaid', 'Quotes', 'Tomorrow'].map((x) => (
          <AdminButton key={x} onClick={() => setF(x)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${f === x ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'border border-line bg-bg text-text'}`}>{x}</AdminButton>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {filtered.map((b) => <BookingRow key={b.ref} b={b} onOpen={onOpen} />)}
        {f === 'Tomorrow' && <p className="py-10 text-center text-sm text-muted">No bookings for tomorrow yet.</p>}
        {f !== 'Tomorrow' && filtered.length === 0 && <p className="py-10 text-center text-sm text-muted">No bookings in this filter.</p>}
      </div>
    </div>
  )
}

function BookingRow({ b, onOpen }: { b: OpsBooking; onOpen: (b: OpsBooking) => void }) {
  return (
    <AdminButton onClick={() => onOpen(b)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-bg p-4 text-left transition-transform duration-150 active:scale-[0.99]">
      <p className="w-12 shrink-0 font-display text-base font-bold tabular-nums text-heading">{b.time}</p>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-heading">{b.route}</p>
        <p className="truncate text-xs text-muted">{b.customer} · {b.driver ?? 'No driver'}</p>
        <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(b.status)}`}>{b.status}</span>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-heading">{money(b.amount, b.currency)}</p>
    </AdminButton>
  )
}

function MessagesTab({ chat, setChat }: { chat: string | null; setChat: (c: string | null) => void }) {
  useArmMessageSoundOnPointer()
  useEffect(() => {
    rememberAlertAudience('staff')
  }, [])
  const [threads, setThreads] = useState<Array<{ ref: string; customer: string; preview: string; time: string; unread: number; readState?: 'read' | 'unread' | null }>>([])
  const [messages, setMessages] = useState<Array<{ id: string; body: string; authorRole: string; time: string; authorName?: string }>>([])
  const [draft, setDraft] = useState('')
  const [waNumber, setWaNumber] = useState<string | null>(null)
  const [openRef, setOpenRef] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const [data, company] = await Promise.all([
        fetch('/api/messages?as=staff').then((r) => r.json()),
        fetch('/api/company').then((r) => r.json()).catch(() => null),
      ])
      if (!alive) return
      setThreads(markThreadOpen(data.threads || [], openRef))
      setWaNumber(company?.company?.whatsappE164 || null)
    }
    load()
    const timer = setInterval(load, 8000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [openRef])

  useEffect(() => {
    if (!chat) {
      setOpenRef(null)
      return
    }
    let alive = true
    const load = async () => {
      const data = await fetch(`/api/messages/${chat}?as=staff`).then((r) => r.json())
      if (!alive) return
      if (data.ok) {
        setMessages(data.messages || [])
        setOpenRef(chat)
        setThreads((prev) => markThreadOpen(prev, chat))
      }
    }
    load()
    const t = setInterval(load, 4000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [chat])

  const send = async () => {
    if (!chat || !draft.trim()) return
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bookingRef: chat, body: draft.trim(), as: 'staff' }),
    })
    setDraft('')
    const data = await fetch(`/api/messages/${chat}?as=staff`).then((r) => r.json())
    if (data.ok) setMessages(data.messages || [])
  }

  const c = threads.find((x) => x.ref === chat)
  if (chat && c) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-line bg-bg px-4 py-3">
          <AdminButton onClick={() => setChat(null)} className="text-sm font-semibold text-link">Back</AdminButton>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-heading">{c.customer}</p>
            <p className="font-mono text-[11px] text-muted">{c.ref}</p>
          </div>
          {waNumber ? (
            <a href={whatsappHref({ e164: waNumber, text: staffMessageNotice(c.ref) })} className="ml-auto text-xs font-bold text-heading">WhatsApp</a>
          ) : (
            <p className="ml-auto max-w-[9rem] text-right text-[10px] leading-snug text-muted">Add the WhatsApp number in Settings</p>
          )}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.authorRole === 'staff' ? 'ml-auto rounded-br-sm bg-navy text-white dark:bg-primary dark:text-navy' : 'rounded-bl-sm bg-bg text-heading'}`}
            >
              {m.body}
              <p className={`mt-1 text-[10px] ${m.authorRole === 'staff' ? 'opacity-70' : 'text-muted'}`}>{m.time}</p>
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-bg p-3">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply…" className="flex-1 rounded-full border border-input-line bg-input px-4 py-2.5 text-sm text-heading placeholder:text-muted" />
          <AdminButton onClick={send} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-on-primary"><Send size={17} /></AdminButton>
        </div>
      </div>
    )
  }
  return (
    <div>
      <div className="border-b border-line bg-bg px-4 py-3">
        <MessageAlertControl />
      </div>
      <ul className="divide-y divide-line bg-bg">
      {threads.map((x) => (
        <li key={x.ref}>
          <AdminButton onClick={() => setChat(x.ref)} className="flex w-full items-center gap-3 px-4 py-4 text-left">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-sm font-bold text-heading">{(x.customer || '?').split(' ').map((s) => s[0]).join('').slice(0, 2)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2"><p className={`truncate text-sm ${x.unread ? 'font-bold text-heading' : 'font-medium text-text'}`}>{x.customer}</p><span className="text-xs text-muted">{x.time}</span></div>
              <p className="truncate text-sm text-muted">{x.preview}</p>
            </div>
            <ReadBadge state={x.readState} />
          </AdminButton>
        </li>
      ))}
      {threads.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">No message threads yet.</li>}
      </ul>
    </div>
  )
}

const MORE_TITLES: Record<string, string> = {
  drivers: 'Drivers',
  vehicles: 'Vehicles',
  customers: 'Customers',
  reports: 'Reports',
  reviews: 'Reviews',
  destinations: 'Destinations',
  pages: 'Pages & blog',
  seo: 'Website & SEO',
  languages: 'Languages',
  staff: 'Staff & permissions',
  appearance: 'Appearance & theme',
  settings: 'Settings',
  routes: 'Routes',
  pricing: 'Pricing',
  content: 'Website content',
  library: 'Image library',
  enquiries: 'Custom enquiries',
}

function MoreTab({
  theme,
  onThemeChange,
  onOpenDesktop,
  liveAnnouncements,
  onOpenAnnouncements,
  onOpenPayments,
  onOpenPage,
}: {
  theme: 'light' | 'dark'
  onThemeChange?: (t: 'light' | 'dark') => void
  onOpenDesktop?: () => void
  liveAnnouncements: number
  onOpenAnnouncements: () => void
  onOpenPayments: () => void
  onOpenPage: (page: 'drivers' | 'vehicles' | 'customers' | 'reports' | 'reviews' | 'pages' | 'seo' | 'languages' | 'staff' | 'appearance' | 'settings' | 'destinations' | 'routes' | 'pricing' | 'enquiries' | 'content' | 'library') => void
}) {
  const items = [
    ['Custom enquiries', MessageSquare, () => onOpenPage('enquiries')],
    ['Website content', FileText, () => onOpenPage('content')],
    ['Image library', Images, () => onOpenPage('library')],
    ['Drivers', UserSquare2, () => onOpenPage('drivers')],
    ['Vehicles', Car, () => onOpenPage('vehicles')],
    ['Routes', Route, () => onOpenPage('routes')],
    ['Pricing', Tag, () => onOpenPage('pricing')],
    ['Customers', Users, () => onOpenPage('customers')],
    ['Payments & refunds', CreditCard, onOpenPayments],
    ['Reports', BarChart3, () => onOpenPage('reports')],
    ['Destinations', MapPinned, () => onOpenPage('destinations')],
    ['Reviews', Star, () => onOpenPage('reviews')],
    ['Pages & blog', FileText, () => onOpenPage('pages')],
    ['Website & SEO', FileText, () => onOpenPage('seo')],
    ['Languages', Globe, () => onOpenPage('languages')],
    ['Staff & permissions', Shield, () => onOpenPage('staff')],
    ['Appearance & theme', Palette, () => onOpenPage('appearance')],
    ['Settings', Settings, () => onOpenPage('settings')],
  ] as const
  return (
    <div className="p-4">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-bg p-4">
        <span className="flex items-center gap-3 text-sm font-semibold text-heading">{theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}</span>
        <AdminToggle label="Dark mode" checked={theme === 'dark'} onChange={enabled => onThemeChange?.(enabled ? 'dark' : 'light')} />
      </div>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-bg">
        <li>
          <AdminButton onClick={onOpenAnnouncements} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-heading">
            <Megaphone size={18} className="text-muted" /> Announcements
            <span className="ml-auto text-xs text-muted">{liveAnnouncements} live</span>
            <ChevronRight size={16} className="text-muted" />
          </AdminButton>
        </li>
        {items.map(([label, Icon, onClick]) => (
          <li key={label}>
            <AdminButton onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-heading">
              <Icon size={18} className="text-muted" /> {label} <ChevronRight size={16} className="ml-auto text-muted" />
            </AdminButton>
          </li>
        ))}
      </ul>
      <AdminButton onClick={onOpenDesktop} className="mt-4 w-full text-center text-sm font-semibold text-link">Open desktop dashboard</AdminButton>
      <AdminButton type="button" onClick={signOutToHome} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line text-sm font-semibold text-heading">
        <LogOut size={16} /> Sign out
      </AdminButton>
    </div>
  )
}

function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return open ? <AdminModal title="Details" onClose={onClose}>{children}</AdminModal> : null
}
