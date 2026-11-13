'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3, Car, ChevronRight, CreditCard, FileText, Globe, Home, LayoutGrid, LogOut, MapPinned, MessageSquare, Moon, Palette, Plus, Route, Search,
  Settings, Shield, Star, Sun, Tag, UserSquare2, Users, CalendarCheck, X, Send, Megaphone, ChevronLeft, Images,
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
  onAnnouncementsChange?: (next: AnnouncementState) => void
}

type DriverOption = { id: string; displayName: string; status: string }
type ServiceRow = { id: string; name: string; type: string; isk: number; duration: string; active: boolean }

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

const KIND_LABEL: Record<string, string> = {
  AIRPORT: 'Fixed route',
  TAXI: 'Taxi',
  TOUR: 'Package',
  DRIVER: 'Hourly',
  CUSTOM: 'Custom',
}

export default function MobileAdmin(props: Props) {
  const p = { ...args, ...props }
  const [tab, setTab] = useState(p.tab)
  const [sheet, setSheet] = useState<OpsBooking | null>(null)
  const [editing, setEditing] = useState<ServiceRow | null>(null)
  const [chat, setChat] = useState<string | null>(null)
  const th = p.theme as 'light' | 'dark'
  const [page, setPage] = useState<'announcements' | 'payments' | 'drivers' | 'vehicles' | 'customers' | 'reports' | 'reviews' | 'pages' | 'seo' | 'languages' | 'staff' | 'appearance' | 'settings' | 'destinations' | 'routes' | 'pricing' | 'enquiries' | 'content' | 'library' | null>(null)
  const [localAnn, setLocalAnn] = useState<AnnouncementState>(ANNOUNCEMENTS_SEED)
  const announcements = props.onAnnouncementsChange ? props.announcements ?? ANNOUNCEMENTS_SEED : localAnn
  const setAnnouncements = props.onAnnouncementsChange ?? setLocalAnn

  const [bookings, setBookings] = useState<OpsBooking[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [source, setSource] = useState('loading')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [compose, setCompose] = useState(false)
  const listings = usePublishedListings()
  const [bookingDraft, setBookingDraft] = useState({ guestName: '', guestEmail: '', listingId: '' })
  const selectedListing = (listings || []).find((listing) => listing.id === bookingDraft.listingId) || null
  const [driverId, setDriverId] = useState('')
  const [statusDraft, setStatusDraft] = useState<OpsBooking['status']>('Confirmed')

  const load = useCallback(async () => {
    try {
      const [bRes, dRes, sRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/drivers'),
        fetch('/api/admin/services'),
      ])
      const bJson = await bRes.json()
      const dJson = await dRes.json()
      const sJson = await sRes.json().catch(() => ({ ok: false }))
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
      if (sJson.ok && Array.isArray(sJson.services)) {
        setServices(
          sJson.services.map((s: { id: string; titleEn: string; kind: string; fromIsk?: number | null; hoursLabel?: string | null; active: boolean }) => ({
            id: s.id,
            name: s.titleEn,
            type: KIND_LABEL[s.kind] || s.kind,
            isk: s.fromIsk ?? 0,
            duration: s.hoursLabel || '—',
            active: s.active,
          })),
        )
      }
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

  const publishService = async () => {
    if (!editing) return
    const isk = Number(String(editing.isk).replace(/\D/g, '')) || 0
    const res = await fetch(`/api/admin/services/${editing.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fromIsk: isk, active: editing.active, hoursLabel: editing.duration === '—' ? null : editing.duration }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      setSaveMsg(data.message || 'Could not publish service')
      return
    }
    setEditing(null)
    await load()
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
      <div className="relative mx-auto flex h-screen max-w-md flex-col overflow-hidden bg-surface font-sans text-text">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg px-4">
          <img src={th === 'dark' ? LOGO_DARK : LOGO_LIGHT} alt="Iceland Taxi Booking" className="h-12 w-auto" />
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={signOutToHome} aria-label="Sign out" className="inline-flex h-10 items-center gap-1 rounded-full px-2 text-sm font-semibold text-heading">
              <LogOut size={18} /> Sign out
            </button>
            <button aria-label="Search" className="grid h-10 w-10 place-items-center rounded-full text-heading"><Search size={19} /></button>
            <StaffNoticeBell
              onOpenChat={(ref) => { setPage(null); setTab('messages'); setChat(ref) }}
              onOpenSettings={() => { setTab('more'); setPage('settings') }}
            />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pb-24">
          {tab === 'home' && <HomeTab bookings={bookings} source={source} onOpen={setSheet} onTab={setTab} onEnquiries={() => setPage('enquiries')} />}
          {tab === 'bookings' && <BookingsTab bookings={bookings} onOpen={setSheet} />}
          {tab === 'messages' && <MessagesTab chat={chat} setChat={setChat} />}
          {tab === 'services' && <ServicesTab services={services} onEdit={setEditing} />}
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
              <button onClick={() => setPage(null)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full text-heading active:bg-surface"><ChevronLeft size={22} /></button>
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
              <button onClick={() => setPage(null)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full text-heading active:bg-surface"><ChevronLeft size={22} /></button>
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
              <button onClick={() => setPage(null)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full text-heading active:bg-surface"><ChevronLeft size={22} /></button>
              <h1 className="font-display text-base font-bold text-heading">Payments</h1>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PaymentsList />
            </div>
          </div>
        )}

        {tab === 'bookings' && compose && (
          <form
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
            className="absolute inset-x-3 bottom-24 z-30 grid max-h-[70%] gap-2 overflow-y-auto rounded-2xl border border-line bg-bg p-3 shadow-lg"
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
            <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary">Save booking</button>
          </form>
        )}
        {tab === 'bookings' && (
          <button aria-label="New booking" onClick={() => setCompose((value) => !value)} className="absolute bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-on-primary shadow-lg transition-transform duration-150 active:scale-95">
            <Plus size={24} />
          </button>
        )}

        <nav className="absolute inset-x-0 bottom-0 grid grid-cols-5 border-t border-line bg-bg pb-5 pt-2">
          {NAV.map(([id, label, Icon]) => {
            const on = tab === id
            return (
              <button key={id} onClick={() => { setTab(id); setChat(null) }} className="relative flex flex-col items-center gap-1 py-1">
                <Icon size={21} className={on ? 'text-heading' : 'text-muted'} strokeWidth={on ? 2.4 : 2} />
                <span className={`text-[11px] ${on ? 'font-bold text-heading' : 'font-medium text-muted'}`}>{label}</span>
              </button>
            )
          })}
        </nav>

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
                <button
                  onClick={() => saveBooking({ status: 'Cancelled', driverId: driverId || null })}
                  className="rounded-xl border border-line py-3.5 text-sm font-semibold text-error"
                >
                  Cancel booking
                </button>
                <button
                  onClick={() => saveBooking({ status: statusDraft, driverId: driverId || null })}
                  className="rounded-xl bg-primary py-3.5 text-sm font-bold text-on-primary"
                >
                  Save
                </button>
              </div>
            </>
          )}
        </Sheet>

        <Sheet open={!!editing} onClose={() => setEditing(null)}>
          {editing && (
            <>
              <h2 className="font-display text-xl font-bold text-heading">{editing.name}</h2>
              <p className="mt-1 text-sm text-muted">{editing.type} pricing</p>
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Base price (ISK)</span>
                  <input
                    value={editing.isk}
                    onChange={(e) => setEditing({ ...editing, isk: Number(e.target.value) || 0 })}
                    type="number"
                    className="mt-1 w-full rounded-xl border border-input-line bg-input px-4 py-3 text-base font-semibold text-heading outline-none focus:border-focus"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Estimated duration</span>
                  <input
                    value={editing.duration}
                    onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-input-line bg-input px-4 py-3 text-base font-semibold text-heading outline-none focus:border-focus"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                  <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="h-5 w-5 accent-[var(--mint)]" />
                  <span className="text-sm font-semibold text-heading">Active on website</span>
                </label>
              </div>
              <p className="mt-4 text-xs text-muted">Confirmed bookings keep the price they were booked at.</p>
              <button onClick={publishService} className="mt-5 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-on-primary">Publish changes</button>
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
        <button onClick={() => onOpen(unassigned[0])} className="flex w-full items-center gap-4 rounded-2xl bg-navy p-4 text-left text-white">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-extrabold text-navy">{unassigned.length}</div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Journeys need a driver</p>
            <p className="truncate text-sm text-white/70">Next: {unassigned[0].time} · {unassigned[0].route}</p>
          </div>
          <ChevronRight size={18} className="text-white/60" />
        </button>
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
          <button onClick={onEnquiries} className="text-sm font-semibold text-link">See all</button>
        </div>
        <div className="mt-3">
          <Enquiries compact limit={3} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-heading">Coming up</h2>
          <button onClick={() => onTab('bookings')} className="text-sm font-semibold text-link">See all</button>
        </div>
        <div className="mt-3 space-y-2">
          {upcoming.slice(0, 4).map((b) => <BookingRow key={b.ref} b={b} onOpen={onOpen} />)}
          {upcoming.length === 0 && <p className="py-6 text-center text-sm text-muted">No upcoming bookings.</p>}
        </div>
      </section>
    </div>
  )
}

function BookingsTab({ bookings, onOpen }: { bookings: OpsBooking[]; onOpen: (b: OpsBooking) => void }) {
  const [f, setF] = useState('Today')
  const filtered = useMemo(
    () =>
      bookings.filter((b) =>
        f === 'Needs driver'
          ? !b.driver && b.status !== 'Pending'
          : f === 'Unpaid'
            ? b.status === 'Awaiting Payment'
            : f === 'Quotes'
              ? b.status === 'Pending'
              : f === 'Tomorrow'
                ? false
                : true,
      ),
    [bookings, f],
  )
  return (
    <div className="p-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {['Today', 'Needs driver', 'Unpaid', 'Quotes', 'Tomorrow'].map((x) => (
          <button key={x} onClick={() => setF(x)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${f === x ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'border border-line bg-bg text-text'}`}>{x}</button>
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
    <button onClick={() => onOpen(b)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-bg p-4 text-left transition-transform duration-150 active:scale-[0.99]">
      <p className="w-12 shrink-0 font-display text-base font-bold tabular-nums text-heading">{b.time}</p>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-heading">{b.route}</p>
        <p className="truncate text-xs text-muted">{b.customer} · {b.driver ?? 'No driver'}</p>
        <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(b.status)}`}>{b.status}</span>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-heading">{money(b.amount, b.currency)}</p>
    </button>
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
      await fetch('/api/auth/demo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'staff' }) })
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
      await fetch('/api/auth/demo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'staff' }) })
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
          <button onClick={() => setChat(null)} className="text-sm font-semibold text-link">Back</button>
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
          <button onClick={send} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-on-primary"><Send size={17} /></button>
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
          <button onClick={() => setChat(x.ref)} className="flex w-full items-center gap-3 px-4 py-4 text-left">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-sm font-bold text-heading">{(x.customer || '?').split(' ').map((s) => s[0]).join('').slice(0, 2)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2"><p className={`truncate text-sm ${x.unread ? 'font-bold text-heading' : 'font-medium text-text'}`}>{x.customer}</p><span className="text-xs text-muted">{x.time}</span></div>
              <p className="truncate text-sm text-muted">{x.preview}</p>
            </div>
            <ReadBadge state={x.readState} />
          </button>
        </li>
      ))}
      {threads.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">No message threads yet.</li>}
      </ul>
    </div>
  )
}

function ServicesTab({ services, onEdit }: { services: ServiceRow[]; onEdit: (s: ServiceRow) => void }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-heading">Services</h1>
        <button className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-2 text-sm font-bold text-on-primary"><Plus size={16} /> New</button>
      </div>
      <div className="mt-4 space-y-2">
        {services.map((s) => (
          <button key={s.id} onClick={() => onEdit(s)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-bg p-4 text-left">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-heading">{s.name}</p>
              <p className="text-xs text-muted">{s.type} · {s.duration}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums text-heading">{s.isk ? `ISK ${s.isk.toLocaleString('en-US')}` : 'Quote'}</p>
              <p className={`text-[11px] font-semibold ${s.active ? 'text-success' : 'text-muted'}`}>{s.active ? 'Live' : 'Hidden'}</p>
            </div>
          </button>
        ))}
        {services.length === 0 && <p className="py-10 text-center text-sm text-muted">Connect DATABASE_URL to manage live services.</p>}
      </div>
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
        <span className="flex items-center gap-3 text-sm font-semibold text-heading">{theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />} Dark mode</span>
        <button role="switch" aria-checked={theme === 'dark'} onClick={() => onThemeChange?.(theme === 'dark' ? 'light' : 'dark')} className={`relative h-7 w-12 rounded-full transition-colors duration-150 ${theme === 'dark' ? 'bg-mint' : 'bg-input-line'}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-150 ease-out ${theme === 'dark' ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-bg">
        <li>
          <button onClick={onOpenAnnouncements} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-heading">
            <Megaphone size={18} className="text-muted" /> Announcements
            <span className="ml-auto text-xs text-muted">{liveAnnouncements} live</span>
            <ChevronRight size={16} className="text-muted" />
          </button>
        </li>
        {items.map(([label, Icon, onClick]) => (
          <li key={label}>
            <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-heading">
              <Icon size={18} className="text-muted" /> {label} <ChevronRight size={16} className="ml-auto text-muted" />
            </button>
          </li>
        ))}
      </ul>
      <button onClick={onOpenDesktop} className="mt-4 w-full text-center text-sm font-semibold text-link">Open desktop dashboard</button>
      <button type="button" onClick={signOutToHome} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line text-sm font-semibold text-heading">
        <LogOut size={16} /> Sign out
      </button>
      <p className="mt-2 text-center text-xs text-muted">Signed in as Juliet · admin@example.local</p>
    </div>
  )
}

function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} className="absolute inset-0 z-40 bg-navy/50" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-x-0 bottom-0 z-50 max-h-[85%] overflow-y-auto rounded-t-3xl bg-bg px-5 pb-8 pt-3"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-input-line" />
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted"><X size={20} /></button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
