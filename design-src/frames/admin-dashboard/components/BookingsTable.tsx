import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Filter, MessageCircle, X } from 'lucide-react'

import { BottomSheet } from '@shared/components/BottomSheet'
import { DRIVERS, TODAY_BOOKINGS, money, statusClass, type OpsBooking } from '@shared/opsData'

const FILTERS = ['All', 'Needs driver', 'Awaiting payment', 'Quotes', 'Completed']

export function BookingsTable() {
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState<OpsBooking | null>(TODAY_BOOKINGS[0])
  const [sheetOpen, setSheetOpen] = useState(false)

  const rows = TODAY_BOOKINGS.filter((b) =>
    filter === 'All' ? true
      : filter === 'Needs driver' ? !b.driver && b.status !== 'Pending'
      : filter === 'Awaiting payment' ? b.status === 'Awaiting Payment'
      : filter === 'Quotes' ? b.status === 'Pending'
      : b.status === 'Completed',
  )
  const open = (b: OpsBooking) => {
    setSelected(b)
    setSheetOpen(true)
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="flex items-center gap-2">
          <div className="no-scrollbar -mx-3 flex min-w-0 flex-1 gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${filter === f ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'border border-line bg-bg text-text hover:border-input-line'}`}>
                {f}
              </button>
            ))}
          </div>
          <button aria-label="More filters" className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-bg px-2.5 py-1.5 text-sm font-medium text-text sm:px-3">
            <Filter size={14} /> <span className="hidden md:inline">Date · Service · Currency</span>
          </button>
        </div>

        {/* Phones and tablets: one card per booking */}
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg md:hidden">
          {rows.map((b) => (
            <li key={b.ref}>
              <button onClick={() => open(b)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface">
                <p className="w-12 shrink-0 font-display text-base font-bold tabular-nums text-heading">{b.time}</p>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-heading">{b.customer}</p>
                  <p className="truncate text-xs text-muted">{b.service}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(b.status)}`}>{b.status}</span>
                    {!b.driver && <span className="text-[11px] font-semibold text-error">Unassigned</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-heading">{money(b.amount, b.currency)}</p>
                  <p className="font-mono text-[10px] text-muted">{b.ref}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>

        {/* Wider screens: the full table */}
        <div className="mt-4 hidden overflow-x-auto rounded-xl border border-line bg-bg md:block">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line text-xs font-semibold text-muted">
              <tr>
                {['Reference', 'Pickup', 'Customer', 'Service', 'Driver', 'Amount', 'Status'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((b) => (
                <tr key={b.ref} onClick={() => open(b)} className={`cursor-pointer transition-colors duration-150 ${selected?.ref === b.ref ? 'bg-surface' : 'hover:bg-surface/60'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-heading">{b.ref}</td>
                  <td className="px-4 py-3 tabular-nums text-heading">{b.time}</td>
                  <td className="px-4 py-3 font-medium text-heading">{b.customer}</td>
                  <td className="px-4 py-3 text-text">{b.service}</td>
                  <td className="px-4 py-3">{b.driver ?? <span className="font-semibold text-error">Unassigned</span>}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-heading">{money(b.amount, b.currency)}</td>
                  <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(b.status)}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Large screens: details sit beside the table */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            key={selected.ref}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="hidden w-[360px] shrink-0 overflow-y-auto border-l border-line bg-bg p-6 xl:block"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-muted">{selected.ref}</p>
                <h2 className="mt-1 font-display text-xl font-bold text-heading">{selected.route}</h2>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close" className="text-muted hover:text-heading"><X size={18} /></button>
            </div>
            <BookingDetail booking={selected} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Smaller screens: details slide up as a sheet */}
      <BottomSheet open={sheetOpen && !!selected} onClose={() => setSheetOpen(false)} title={selected?.route} hideFrom="xl">
        {selected && (
          <>
            <p className="font-mono text-xs text-muted">{selected.ref}</p>
            <BookingDetail booking={selected} />
          </>
        )}
      </BottomSheet>
    </div>
  )
}

function BookingDetail({ booking }: { booking: OpsBooking }) {
  return (
    <>
      <span className={`mt-3 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(booking.status)}`}>{booking.status}</span>
      <dl className="mt-5 divide-y divide-line text-sm">
        {[
          ['Customer', booking.customer],
          ['Service', booking.service],
          ['Pickup', booking.time],
          ['Passengers', String(booking.pax)],
          ['Vehicle', booking.vehicle],
          ['Total', `${money(booking.amount, booking.currency)} · ${booking.currency}`],
          ...(booking.flight ? [['Flight', booking.flight]] : []),
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right font-medium text-heading">{v}</dd></div>
        ))}
      </dl>
      <label className="mt-5 block text-xs font-semibold text-muted">Driver</label>
      <select key={booking.ref + 'd'} defaultValue={booking.driver ?? ''} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2.5 text-sm text-heading">
        <option value="">Choose a driver…</option>
        {DRIVERS.map((d) => <option key={d.name} value={d.name} disabled={d.status === 'Off duty'}>{d.name} — {d.status}</option>)}
      </select>
      <p className="mt-1.5 text-xs text-muted">Drivers on an overlapping journey are blocked by availability rules.</p>
      <label className="mt-4 block text-xs font-semibold text-muted">Status</label>
      <select key={booking.ref + 's'} defaultValue={booking.status} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2.5 text-sm text-heading">
        {['Pending', 'Awaiting Payment', 'Confirmed', 'Driver Assigned', 'Driver En Route', 'In Progress', 'Completed', 'Cancelled', 'Refund Requested', 'Refunded'].map((s) => <option key={s}>{s}</option>)}
      </select>
      <label className="mt-4 block text-xs font-semibold text-muted">Internal note</label>
      <textarea rows={3} placeholder="Visible to staff only" className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading placeholder:text-muted" />
      <div className="mt-5 flex gap-2">
        <button className="flex-1 rounded-lg bg-primary py-3 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover xl:py-2.5">Save changes</button>
        <button className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line px-3 text-sm font-semibold text-heading"><MessageCircle size={15} /> Message</button>
      </div>
    </>
  )
}
