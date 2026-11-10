import React, { useState } from 'react'
import { Briefcase, Clock, History, MapPin, Moon, Navigation, Phone, Plane, StickyNote, Sun, Users, CalendarDays } from 'lucide-react'

import { LOGO_DARK, LOGO_LIGHT } from '@shared/data'

export const viewport = 'mobile'

export const args = {
  tab: 'today',
  theme: 'dark',
  jobStatus: 'Driver Assigned',
}

export const argTypes = {
  tab: { control: 'radio', options: ['today', 'history'] },
  theme: { control: 'radio', options: ['light', 'dark'] },
  jobStatus: { control: 'select', options: ['Driver Assigned', 'Acknowledged', 'Driver En Route', 'In Progress', 'Completed'] },
}

type Props = Partial<typeof args> & { onThemeChange?: (t: 'light' | 'dark') => void; onViewSite?: () => void }

const FLOW = ['Driver Assigned', 'Acknowledged', 'Driver En Route', 'In Progress', 'Completed'] as const
const NEXT_ACTION: Record<string, string> = {
  'Driver Assigned': 'Acknowledge assignment',
  Acknowledged: 'Start driving to pickup',
  'Driver En Route': 'Passenger picked up',
  'In Progress': 'Complete journey',
}

const UPCOMING = [
  { time: '18:15', route: 'Hotel Saga → KEF', pax: 2, vehicle: 'SUV · PT-903' },
  { time: '21:30', route: 'Reykjavík → Þingvellir · Northern Lights', pax: 3, vehicle: 'SUV · PT-903' },
]
const PAST = [
  { date: 'Thu 13 Mar', route: 'KEF → Reykjavík', ref: 'ITB-6YH2LD' },
  { date: 'Thu 13 Mar', route: 'Golden Circle Private Tour', ref: 'ITB-1QA9TR' },
  { date: 'Wed 12 Mar', route: 'Reykjavík → Blue Lagoon → KEF', ref: 'ITB-7MV3PS' },
]

export default function DriverPortal(props: Props) {
  const p = { ...args, ...props }
  const [tab, setTab] = useState(p.tab)
  const [status, setStatus] = useState<string>(p.jobStatus)
  const th = p.theme as 'light' | 'dark'
  const stepIndex = FLOW.indexOf(status as (typeof FLOW)[number])

  return (
    <div className={th === 'dark' ? 'dark' : ''}>
      <div className="relative flex h-screen flex-col overflow-hidden bg-bg font-sans text-text">
        <header className="shrink-0 border-b border-line">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:h-20">
          <img src={th === 'dark' ? LOGO_DARK : LOGO_LIGHT} alt="Iceland Taxi Booking" className="h-12 w-auto lg:h-14" />
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">Driver</span>
          <div className="ml-6 hidden items-center rounded-full border border-line p-0.5 text-sm font-semibold lg:flex" role="tablist">
            {([['today', 'Today', CalendarDays], ['history', 'History', History]] as const).map(([id, label, Icon]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors duration-150 ${tab === id ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted hover:text-heading'}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          <button onClick={() => p.onThemeChange?.(th === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" className="ml-auto grid h-10 w-10 place-items-center rounded-full text-heading">
            {th === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-10">
          {tab === 'today' ? (
            <div className="mx-auto max-w-xl p-4 sm:p-6 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-x-12 lg:p-8">
              <div>
              <p className="text-sm text-muted">Friday 14 March · Ari Þ.</p>
              <h1 className="font-display text-2xl font-bold text-heading lg:text-3xl">Next pickup</h1>

              {status === 'Completed' ? (
                <div className="mt-4 rounded-2xl border border-line bg-surface p-6 text-center">
                  <p className="font-display text-lg font-bold text-heading">Journey completed</p>
                  <p className="mt-1 text-sm text-muted">ITB-5RT7CV has been marked complete. Your next trip is at 18:15.</p>
                </div>
              ) : (
                <article className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
                  <div className="bg-navy px-5 py-4 text-white">
                    <div className="flex items-baseline justify-between">
                      <p className="font-display text-4xl font-extrabold tabular-nums">15:30</p>
                      <p className="font-mono text-xs text-white/70">ITB-7K4Q2M</p>
                    </div>
                    <p className="mt-1 text-sm text-white/80">Airport transfer · Comfort Sedan</p>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-mint" />
                        <span className="my-1 w-px flex-1 bg-line" />
                        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <p className="text-xs text-muted">Pickup</p>
                          <p className="font-semibold text-heading">Keflavík Airport, arrivals hall</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted">Drop-off</p>
                          <p className="font-semibold text-heading">Hotel Borg, Pósthússtræti 11</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-bg py-2.5"><Plane size={14} className="mx-auto text-muted" /><p className="mt-1 font-semibold text-heading">FI 615</p><p className="text-muted">On time</p></div>
                      <div className="rounded-xl bg-bg py-2.5"><Users size={14} className="mx-auto text-muted" /><p className="mt-1 font-semibold text-heading">2 pax</p><p className="text-muted">Adults</p></div>
                      <div className="rounded-xl bg-bg py-2.5"><Briefcase size={14} className="mx-auto text-muted" /><p className="mt-1 font-semibold text-heading">2 bags</p><p className="text-muted">Large</p></div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl bg-bg p-3 text-sm">
                      <StickyNote size={16} className="mt-0.5 shrink-0 text-muted" />
                      <p className="text-text">Meet & greet with name sign: <strong className="text-heading">Larsen</strong>. Flight may land early.</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-heading">Emma Larsen</p>
                        <p className="text-xs text-muted">+45 20 12 34 56</p>
                      </div>
                      <div className="flex gap-2">
                        <a href="#" aria-label="Call customer" className="grid h-11 w-11 place-items-center rounded-full border border-line text-heading"><Phone size={18} /></a>
                        <a href="#" aria-label="Open navigation" className="grid h-11 w-11 place-items-center rounded-full border border-line text-heading"><Navigation size={18} /></a>
                      </div>
                    </div>

                    {/* progress */}
                    <ol className="flex gap-1 pt-1" aria-label="Journey progress">
                      {FLOW.map((s, i) => (
                        <li key={s} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${i <= stepIndex ? 'bg-mint' : 'bg-line'}`} />
                      ))}
                    </ol>
                    <p className="text-xs text-muted">Status: <strong className="text-heading">{status}</strong></p>
                    <button
                      onClick={() => setStatus(FLOW[Math.min(stepIndex + 1, FLOW.length - 1)])}
                      className="hidden w-full rounded-2xl bg-primary py-4 text-base font-bold text-on-primary transition-transform duration-150 active:scale-[0.98] lg:block"
                    >
                      {NEXT_ACTION[status]}
                    </button>
                  </div>
                </article>
              )}
              </div>

              <div className="lg:pt-12">
              <h2 className="mt-8 font-display text-base font-bold text-heading lg:mt-0">Later today</h2>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {UPCOMING.map((u) => (
                  <li key={u.time} className="flex items-center gap-4 py-3.5">
                    <p className="w-12 font-display font-bold tabular-nums text-heading">{u.time}</p>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-heading">{u.route}</p>
                      <p className="text-xs text-muted">{u.pax} pax · {u.vehicle}</p>
                    </div>
                  </li>
                ))}
              </ul>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-xl p-4 sm:p-6 lg:max-w-3xl lg:p-8">
              <h1 className="font-display text-2xl font-bold text-heading">Journey history</h1>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {PAST.map((j) => (
                  <li key={j.ref} className="py-3.5">
                    <p className="text-sm font-semibold text-heading">{j.route}</p>
                    <p className="text-xs text-muted">{j.date} · <span className="font-mono">{j.ref}</span> · Completed</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>

        {tab === 'today' && status !== 'Completed' && (
          <div className="absolute inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] mx-auto max-w-xl px-4 pb-3 sm:px-6 lg:hidden">
            <button
              onClick={() => setStatus(FLOW[Math.min(stepIndex + 1, FLOW.length - 1)])}
              className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-on-primary transition-transform duration-150 active:scale-[0.98]"
            >
              {NEXT_ACTION[status]}
            </button>
          </div>
        )}

        <nav className="absolute inset-x-0 bottom-0 grid grid-cols-2 border-t border-line bg-bg pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
          {([['today', 'Today', CalendarDays], ['history', 'History', History]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className="flex flex-col items-center gap-1 py-1">
              <Icon size={21} className={tab === id ? 'text-heading' : 'text-muted'} />
              <span className={`text-[11px] ${tab === id ? 'font-bold text-heading' : 'font-medium text-muted'}`}>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
