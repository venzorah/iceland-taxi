import React from 'react'
import { AlertCircle, ArrowRight, Plane, UserPlus } from 'lucide-react'

import { CONVERSATIONS, DRIVERS, TODAY_BOOKINGS, money, statusClass } from '@shared/opsData'

const WEEK = [
  { d: 'Mon', usd: 1820, isk: 210 },
  { d: 'Tue', usd: 2410, isk: 180 },
  { d: 'Wed', usd: 1960, isk: 320 },
  { d: 'Thu', usd: 3120, isk: 260 },
  { d: 'Fri', usd: 3780, isk: 410 },
  { d: 'Sat', usd: 4210, isk: 350 },
  { d: 'Sun', usd: 2640, isk: 290 },
]

export function Overview({ onOpenBookings }: { onOpenBookings?: () => void }) {
  const sorted = [...TODAY_BOOKINGS].filter((b) => b.time !== '—').sort((a, b) => a.time.localeCompare(b.time))
  const needDriver = TODAY_BOOKINGS.filter((b) => !b.driver && b.status !== 'Pending').length
  const max = Math.max(...WEEK.map((w) => w.usd))

  return (
    <div className="mx-auto max-w-[1400px] p-3 sm:p-6">
      {/* Attention strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-bg px-4 py-3.5 text-sm sm:gap-x-6 sm:px-5">
        <span className="font-semibold text-heading">Friday 14 March</span>
        <span className="text-muted"><strong className="text-heading">{TODAY_BOOKINGS.length}</strong> bookings today</span>
        <span className="flex items-center gap-1.5 text-error"><AlertCircle size={15} /><strong>{needDriver}</strong> need a driver</span>
        <span className="text-muted"><strong className="text-heading">1</strong> awaiting payment</span>
        <span className="text-muted"><strong className="text-heading">1</strong> quotation request</span>
        <button onClick={onOpenBookings} className="inline-flex items-center gap-1 whitespace-nowrap font-semibold sm:ml-auto text-link hover:underline">All bookings <ArrowRight size={14} /></button>
      </div>

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[1fr_380px]">
        {/* Primary: today's dispatch */}
        <section className="rounded-xl border border-line bg-bg">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
            <h2 className="font-display text-base font-bold text-heading">Today's journeys</h2>
            <span className="hidden text-xs text-muted sm:inline">Live · updates across desktop and mobile</span>
          </div>
          <ol className="divide-y divide-line">
            {sorted.map((b) => (
              <li key={b.ref} className="grid grid-cols-[52px_1fr] gap-x-3 gap-y-3 px-4 py-4 sm:grid-cols-[64px_1fr_auto] sm:gap-4 sm:px-5">
                <p className="font-display text-lg font-bold tabular-nums text-heading">{b.time}</p>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-heading">{b.route}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(b.status)}`}>{b.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {b.customer} · {b.pax} pax · {b.vehicle} · <span className="font-mono text-xs">{b.ref}</span>
                    {b.flight && <span className="ml-2 inline-flex items-center gap-1"><Plane size={12} />{b.flight}</span>}
                  </p>
                </div>
                <div className="col-start-2 flex items-center justify-between gap-3 sm:col-start-auto sm:justify-end">
                  {b.driver ? (
                    <span className="text-sm text-text">{b.driver}</span>
                  ) : (
                    <button className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">
                      <UserPlus size={14} /> Assign driver
                    </button>
                  )}
                  <span className="text-right text-sm sm:w-24 font-semibold tabular-nums text-heading">{money(b.amount, b.currency)}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Secondary column */}
        <div className="grid content-start gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-1">
          <section className="rounded-xl border border-line bg-bg p-5">
            <h2 className="font-display text-base font-bold text-heading">Revenue this week</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted">USD</p>
                <p className="font-display text-xl font-extrabold text-heading sm:text-2xl">$19,940</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">ISK</p>
                <p className="whitespace-nowrap font-display text-xl font-extrabold text-heading sm:text-2xl">2.020.000 kr</p>
              </div>
            </div>
            <div className="mt-5 flex h-28 items-end gap-2" aria-label="USD revenue by day">
              {WEEK.map((w) => (
                <div key={w.d} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="w-full rounded-t bg-link/80" style={{ height: `${(w.usd / max) * 88}px` }} />
                  <span className="text-[11px] text-muted">{w.d}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Totals are never combined across currencies. Outstanding: $434 · 129.900 kr</p>
          </section>

          <section className="rounded-xl border border-line bg-bg">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="font-display text-base font-bold text-heading">Messages</h2>
              <span className="rounded-full bg-primary px-2 text-xs font-bold text-on-primary">3 unread</span>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {CONVERSATIONS.map((c) => (
                <li key={c.ref} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-sm ${c.unread ? 'font-bold text-heading' : 'font-medium text-text'}`}>{c.name}</p>
                    <span className="text-xs text-muted">{c.time}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted">{c.last}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-line bg-bg p-5">
            <h2 className="font-display text-base font-bold text-heading">Drivers</h2>
            <ul className="mt-3 space-y-2.5">
              {DRIVERS.map((d) => (
                <li key={d.name} className="flex items-center gap-3 text-sm">
                  <span className={`h-2 w-2 rounded-full ${d.status === 'Available' ? 'bg-mint' : d.status === 'On trip' ? 'bg-cyan' : 'bg-muted'}`} />
                  <span className="shrink-0 font-medium text-heading">{d.name}</span>
                  <span className="hidden min-w-0 truncate text-muted sm:inline">{d.vehicle}</span>
                  <span className="ml-auto whitespace-nowrap text-xs text-muted">{d.status}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
