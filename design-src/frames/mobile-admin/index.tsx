import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3, Bell, Car, ChevronRight, CreditCard, FileText, Home, LayoutGrid, MessageSquare, Moon, Palette, Plus, Search,
  Settings, Shield, Sun, Tag, UserSquare2, Users, CalendarCheck, X, Send, Megaphone, ChevronLeft,
} from 'lucide-react'

import { AnnouncementsManager } from '@shared/components/AnnouncementsManager'
import { ANNOUNCEMENTS_SEED, visibleAnnouncements, type AnnouncementState } from '@shared/announcements'

import { LOGO_DARK, LOGO_LIGHT } from '@shared/data'
import { CONVERSATIONS, DRIVERS, TODAY_BOOKINGS, money, statusClass, type OpsBooking } from '@shared/opsData'

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

const SERVICES = [
  { name: 'KEF → Reykjavík transfer', type: 'Fixed route', isk: 22900, duration: '45 min', active: true },
  { name: 'Golden Circle Private Tour', type: 'Package', isk: 89900, duration: '8 h', active: true },
  { name: 'Private driver · hourly', type: 'Hourly', isk: 14900, duration: 'per hour · min 2 h', active: true },
  { name: 'Northern Lights Experience', type: 'Package', isk: 59900, duration: '4 h', active: true },
  { name: 'Cruise port transfer', type: 'Fixed route', isk: 9900, duration: '15 min', active: false },
]

export default function MobileAdmin(props: Props) {
  const p = { ...args, ...props }
  const [tab, setTab] = useState(p.tab)
  const [sheet, setSheet] = useState<OpsBooking | null>(null)
  const [editing, setEditing] = useState<(typeof SERVICES)[number] | null>(null)
  const [chat, setChat] = useState<string | null>(null)
  const th = p.theme as 'light' | 'dark'
  const [page, setPage] = useState<'announcements' | null>(null)
  const [localAnn, setLocalAnn] = useState<AnnouncementState>(ANNOUNCEMENTS_SEED)
  const announcements = props.onAnnouncementsChange ? props.announcements ?? ANNOUNCEMENTS_SEED : localAnn
  const setAnnouncements = props.onAnnouncementsChange ?? setLocalAnn

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
        {/* App bar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg px-4">
          <img src={th === 'dark' ? LOGO_DARK : LOGO_LIGHT} alt="Iceland Taxi Booking" className="h-12 w-auto" />
          <div className="ml-auto flex items-center gap-1">
            <button aria-label="Search" className="grid h-10 w-10 place-items-center rounded-full text-heading"><Search size={19} /></button>
            <button aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full text-heading">
              <Bell size={19} /><span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-error" />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pb-24">
          {tab === 'home' && <HomeTab onOpen={setSheet} onTab={setTab} />}
          {tab === 'bookings' && <BookingsTab onOpen={setSheet} />}
          {tab === 'messages' && <MessagesTab chat={chat} setChat={setChat} />}
          {tab === 'services' && <ServicesTab onEdit={setEditing} />}
          {tab === 'more' && <MoreTab theme={th} onThemeChange={p.onThemeChange} onOpenDesktop={p.onOpenDesktop} liveAnnouncements={visibleAnnouncements(announcements).length} onOpenAnnouncements={() => setPage('announcements')} />}
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

        {tab === 'bookings' && (
          <button aria-label="New booking" className="absolute bottom-24 right-4 grid h-14 w-14 place-items-center rounded-full bg-primary text-on-primary shadow-lg transition-transform duration-150 active:scale-95">
            <Plus size={24} />
          </button>
        )}

        {/* Bottom navigation */}
        <nav className="absolute inset-x-0 bottom-0 grid grid-cols-5 border-t border-line bg-bg pb-5 pt-2">
          {NAV.map(([id, label, Icon]) => {
            const on = tab === id
            return (
              <button key={id} onClick={() => { setTab(id); setChat(null) }} className="relative flex flex-col items-center gap-1 py-1">
                <Icon size={21} className={on ? 'text-heading' : 'text-muted'} strokeWidth={on ? 2.4 : 2} />
                <span className={`text-[11px] ${on ? 'font-bold text-heading' : 'font-medium text-muted'}`}>{label}</span>
                {id === 'messages' && <span className="absolute right-[22%] top-0 rounded-full bg-primary px-1.5 text-[10px] font-bold text-on-primary">3</span>}
              </button>
            )
          })}
        </nav>

        {/* Booking sheet */}
        <Sheet open={!!sheet} onClose={() => setSheet(null)}>
          {sheet && (
            <>
              <p className="font-mono text-xs text-muted">{sheet.ref}</p>
              <h2 className="mt-1 font-display text-xl font-bold text-heading">{sheet.route}</h2>
              <p className="mt-1 text-sm text-muted">{sheet.time} · {sheet.customer} · {sheet.pax} pax · {sheet.vehicle}</p>
              <span className={`mt-3 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(sheet.status)}`}>{sheet.status}</span>
              <p className="mt-5 text-xs font-semibold text-muted">Assign driver</p>
              <div className="mt-2 space-y-2">
                {DRIVERS.filter((d) => d.status !== 'Off duty').map((d) => (
                  <label key={d.name} className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
                    <input type="radio" name="driver" defaultChecked={sheet.driver === d.name} className="h-4 w-4 accent-[var(--navy)] dark:accent-[var(--primary)]" />
                    <span className="flex-1 text-sm font-semibold text-heading">{d.name}</span>
                    <span className="text-xs text-muted">{d.status}</span>
                  </label>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button className="rounded-xl border border-line py-3.5 text-sm font-semibold text-error">Cancel booking</button>
                <button onClick={() => setSheet(null)} className="rounded-xl bg-primary py-3.5 text-sm font-bold text-on-primary">Save</button>
              </div>
            </>
          )}
        </Sheet>

        {/* Service edit sheet */}
        <Sheet open={!!editing} onClose={() => setEditing(null)}>
          {editing && (
            <>
              <h2 className="font-display text-xl font-bold text-heading">{editing.name}</h2>
              <p className="mt-1 text-sm text-muted">{editing.type} pricing</p>
              <div className="mt-5 space-y-4">
                <Field label="Base price (ISK)" value={editing.isk.toLocaleString('en-US').replace(/,/g, '.')} />
                <Field label="USD override (optional)" value="" placeholder={`Auto · $${Math.round(editing.isk / 138)}`} />
                <Field label="Estimated duration" value={editing.duration} />
                <Field label="Night surcharge (22:00–06:00)" value="15%" />
              </div>
              <p className="mt-4 text-xs text-muted">Confirmed bookings keep the price they were booked at.</p>
              <button onClick={() => setEditing(null)} className="mt-5 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-on-primary">Publish changes</button>
            </>
          )}
        </Sheet>
      </div>
    </div>
  )
}

function HomeTab({ onOpen, onTab }: { onOpen: (b: OpsBooking) => void; onTab: (t: string) => void }) {
  const unassigned = TODAY_BOOKINGS.filter((b) => !b.driver && b.status !== 'Pending')
  const upcoming = [...TODAY_BOOKINGS].filter((b) => b.time !== '—' && b.status !== 'Completed').sort((a, b) => a.time.localeCompare(b.time))
  return (
    <div className="space-y-5 p-4">
      <div>
        <p className="text-sm text-muted">Friday 14 March</p>
        <h1 className="font-display text-2xl font-bold text-heading">Good afternoon</h1>
      </div>

      <button onClick={() => onOpen(unassigned[0])} className="flex w-full items-center gap-4 rounded-2xl bg-navy p-4 text-left text-white">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-extrabold text-navy">{unassigned.length}</div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Journeys need a driver</p>
          <p className="truncate text-sm text-white/70">Next: {unassigned[0].time} · {unassigned[0].route}</p>
        </div>
        <ChevronRight size={18} className="text-white/60" />
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-bg p-4">
          <p className="text-xs text-muted">Today · USD</p>
          <p className="font-display text-xl font-extrabold text-heading">$1,505</p>
        </div>
        <div className="rounded-2xl border border-line bg-bg p-4">
          <p className="text-xs text-muted">Today · ISK</p>
          <p className="font-display text-xl font-extrabold text-heading">154.800 kr</p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-heading">Coming up</h2>
          <button onClick={() => onTab('bookings')} className="text-sm font-semibold text-link">See all</button>
        </div>
        <div className="mt-3 space-y-2">
          {upcoming.slice(0, 4).map((b) => <BookingRow key={b.ref} b={b} onOpen={onOpen} />)}
        </div>
      </section>
    </div>
  )
}

function BookingsTab({ onOpen }: { onOpen: (b: OpsBooking) => void }) {
  const [f, setF] = useState('Today')
  return (
    <div className="p-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {['Today', 'Needs driver', 'Unpaid', 'Quotes', 'Tomorrow'].map((x) => (
          <button key={x} onClick={() => setF(x)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${f === x ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'border border-line bg-bg text-text'}`}>{x}</button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {TODAY_BOOKINGS.filter((b) => f === 'Needs driver' ? !b.driver && b.status !== 'Pending' : f === 'Unpaid' ? b.status === 'Awaiting Payment' : f === 'Quotes' ? b.status === 'Pending' : f === 'Tomorrow' ? false : true).map((b) => <BookingRow key={b.ref} b={b} onOpen={onOpen} />)}
        {f === 'Tomorrow' && <p className="py-10 text-center text-sm text-muted">No bookings for tomorrow yet.</p>}
      </div>
    </div>
  )
}

function BookingRow({ b, onOpen }: { b: OpsBooking; onOpen: (b: OpsBooking) => void; key?: React.Key }) {
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
  const c = CONVERSATIONS.find((x) => x.ref === chat)
  if (c) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-line bg-bg px-4 py-3">
          <button onClick={() => setChat(null)} className="text-sm font-semibold text-link">Back</button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-heading">{c.name}</p>
            <p className="font-mono text-[11px] text-muted">{c.ref}</p>
          </div>
        </div>
        <div className="flex-1 space-y-3 p-4">
          <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-bg px-4 py-2.5 text-sm text-heading">{c.last}<p className="mt-1 text-[10px] text-muted">{c.time}</p></div>
          <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-navy px-4 py-2.5 text-sm text-white dark:bg-primary dark:text-navy">No problem — your driver tracks the flight and will be waiting at arrivals.<p className="mt-1 text-[10px] opacity-70">14:55 · Read</p></div>
        </div>
        <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-bg p-3">
          <input placeholder="Reply…" className="flex-1 rounded-full border border-input-line bg-input px-4 py-2.5 text-sm text-heading placeholder:text-muted" />
          <button aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-on-primary"><Send size={17} /></button>
        </div>
      </div>
    )
  }
  return (
    <ul className="divide-y divide-line bg-bg">
      {CONVERSATIONS.map((x) => (
        <li key={x.ref}>
          <button onClick={() => setChat(x.ref)} className="flex w-full items-center gap-3 px-4 py-4 text-left">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-sm font-bold text-heading">{x.name.split(' ').map((s) => s[0]).join('')}</div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2"><p className={`truncate text-sm ${x.unread ? 'font-bold text-heading' : 'font-medium text-text'}`}>{x.name}</p><span className="text-xs text-muted">{x.time}</span></div>
              <p className="truncate text-sm text-muted">{x.last}</p>
            </div>
            {x.unread > 0 && <span className="rounded-full bg-primary px-2 text-xs font-bold text-on-primary">{x.unread}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}

function ServicesTab({ onEdit }: { onEdit: (s: (typeof SERVICES)[number]) => void }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-heading">Services</h1>
        <button className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-2 text-sm font-bold text-on-primary"><Plus size={16} /> New</button>
      </div>
      <div className="mt-4 space-y-2">
        {SERVICES.map((s) => (
          <button key={s.name} onClick={() => onEdit(s)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-bg p-4 text-left">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-heading">{s.name}</p>
              <p className="text-xs text-muted">{s.type} · {s.duration}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums text-heading">{s.isk.toLocaleString('en-US').replace(/,/g, '.')} kr</p>
              <p className={`text-[11px] font-semibold ${s.active ? 'text-success' : 'text-muted'}`}>{s.active ? 'Live' : 'Hidden'}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MoreTab({ theme, onThemeChange, onOpenDesktop, liveAnnouncements, onOpenAnnouncements }: { theme: 'light' | 'dark'; onThemeChange?: (t: 'light' | 'dark') => void; onOpenDesktop?: () => void; liveAnnouncements: number; onOpenAnnouncements: () => void }) {
  const items = [
    ['Drivers', UserSquare2], ['Vehicles', Car], ['Customers', Users], ['Payments & refunds', CreditCard],
    ['Reports', BarChart3], ['Website & SEO', FileText], ['Staff & permissions', Shield], ['Appearance & theme', Palette], ['Settings', Settings],
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
        {items.map(([label, Icon]) => (
          <li key={label}>
            <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-heading">
              <Icon size={18} className="text-muted" /> {label} <ChevronRight size={16} className="ml-auto text-muted" />
            </button>
          </li>
        ))}
      </ul>
      <button onClick={onOpenDesktop} className="mt-4 w-full text-center text-sm font-semibold text-link">Open desktop dashboard</button>
      <p className="mt-2 text-center text-xs text-muted">Signed in as Demo admin · Super Admin</p>
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

function Field({ label, value, placeholder }: { label: string; value: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <input defaultValue={value} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-input-line bg-input px-4 py-3 text-base font-semibold text-heading outline-none placeholder:font-normal placeholder:text-muted focus:border-focus" />
    </label>
  )
}
