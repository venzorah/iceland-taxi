'use client'

import { AdminEmpty, AdminButton, AdminModal, AdminNotice, useAdminConfirm } from '@/components/admin/AdminUI'
import React, { useCallback, useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'

import { useLivePolling } from '@/lib/polling/use-live-polling'
import { money, statusClass, type OpsBooking } from '@/lib/design/opsData'

const FILTERS = ['All', 'Needs driver', 'Awaiting payment', 'Quotes', 'Completed']

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

type DriverOption = { id: string; displayName: string; status: string }

export function BookingsTable({ searchQuery = '' }: { searchQuery?: string }) {
  const confirm = useAdminConfirm()
  const [pages, setPages] = useState<(string | null)[]>([null])
  const cursor = pages[pages.length - 1]
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [filter, setFilter] = useState('All')
  const [rows, setRows] = useState<OpsBooking[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [selected, setSelected] = useState<OpsBooking | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>('loading')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [search, setSearch] = useState(searchQuery)
  const [serverSearch, setServerSearch] = useState(searchQuery)
  useEffect(() => { const timer = setTimeout(() => setServerSearch(search.trim()), 300); return () => clearTimeout(timer) }, [search])
  useEffect(() => { setPages([null]); setLoading(true) }, [serverSearch, filter])
  useEffect(() => { setSearch(searchQuery) }, [searchQuery])
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [bRes, dRes] = await Promise.all([fetch(`/api/bookings?${new URLSearchParams({ q: serverSearch, filter, ...(cursor ? { cursor } : {}) })}`, { signal, cache: 'no-store' }), fetch('/api/drivers', { signal, cache: 'no-store' })])
      const bJson = await bRes.json()
      const dJson = await dRes.json()
      if (!bRes.ok || !bJson.ok || !dRes.ok || !dJson.ok) throw new Error(bJson.message || dJson.message || 'Could not load bookings.')
      if (signal?.aborted) return
      const ops: OpsBooking[] = bJson.ops || bJson.bookings || []
      setRows(ops)
      setNextCursor(bJson.nextCursor || null)
      setSource(bJson.source || 'unknown')
      setSelected(current => current && ops.some(b => b.ref === current.ref) ? current : null)
      const driverList: DriverOption[] = (dJson.drivers || []).filter((d: { active?: boolean }) => d.active !== false).map(
        (d: { active?: boolean; id?: string; displayName?: string; name?: string; status?: string }) => ({
          id: d.id || d.displayName || d.name || '',
          displayName: d.displayName || d.name || 'Driver',
          status: d.status || 'Available',
        }),
      )
      setDrivers(driverList)
    } catch (e) { if (!signal?.aborted) setSaveMsg(e instanceof Error ? e.message : 'Could not load bookings.'); throw e } finally { if (!signal?.aborted) setLoading(false) }
  }, [cursor, serverSearch, filter])
  useLivePolling(load, true, 20000)

  const filtered = rows

  const open = (b: OpsBooking) => {
    setSelected(b)
    setSheetOpen(true)
  }

  const remove = async (ref: string) => {
    if (!await confirm({ title: 'Cancel booking?', description: 'Unpaid, unstarted trips can be cancelled. Paid bookings become cancellation/refund requests for review. No money is refunded automatically.', confirmLabel: 'Cancel booking', danger: true })) return
    setSaveMsg(null)
    try {
    const res = await fetch(`/api/bookings/${ref}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELLED', expectedStatus: selected ? STATUS_TO_API[selected.status] : undefined }) })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      setSaveMsg(data?.message || 'Could not cancel booking')
      return
    }
    setSelected(null)
    setSheetOpen(false)
    setSaveMsg(data.booking?.status === 'REFUND_REQUESTED' ? 'Cancellation/refund request saved for review. No refund was issued.' : 'Booking cancelled.')
    await load()
    } catch { setSaveMsg('Could not confirm the cancellation. Refresh the booking before retrying.') }
  }

  const save = async (patch: { status?: string; driverId?: string | null; notes?: string; pickupAddress?: string | null }) => {
    if (!selected) return
    setSaveMsg(null)
    try {
    const res = await fetch(`/api/bookings/${selected.ref}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedStatus: STATUS_TO_API[selected.status],
        status: patch.status ? STATUS_TO_API[patch.status] || patch.status : undefined,
        driverId: patch.driverId,
        notes: patch.notes,
        pickupAddress: patch.pickupAddress,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      setSaveMsg(data.message || 'Could not save booking')
      return
    }
    setSaveMsg('Saved')
    await load()
    if (data.ops) setSelected(data.ops)
    } catch { setSaveMsg('Could not confirm the changes. Refresh the booking before retrying.') }
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="flex items-center gap-2">
          <div className="no-scrollbar -mx-3 flex min-w-0 flex-1 gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {FILTERS.map((f) => (
              <AdminButton
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${filter === f ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'border border-line bg-bg text-text hover:border-input-line'}`}
              >
                {f}
              </AdminButton>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3"><label className="min-w-0 flex-1 text-sm text-muted">Search bookings<input aria-label="Search bookings" value={search} onChange={e => setSearch(e.target.value)} type="search" maxLength={200} placeholder="Reference, customer, route or driver" className="mt-1 block w-full rounded-lg border border-line bg-input px-3 py-2 text-heading" /></label><a href="/book" className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary">New booking</a></div>
        <p className="mt-2 text-xs text-muted">
          {loading ? 'Loading bookings…' : `${filtered.length} bookings`}
          {saveMsg ? ` · ${saveMsg}` : ''}
        </p>

        {!loading && source === 'database' && !filtered.length && <div className="mt-4"><AdminEmpty title={rows.length ? 'No matching bookings' : 'No bookings yet'} description={rows.length ? 'Try another search or filter.' : 'New bookings will appear here with their journey and payment status.'} /></div>}
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg md:hidden">
          {filtered.map((b) => (
            <li key={b.ref}>
              <AdminButton onClick={() => open(b)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface">
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
              </AdminButton>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3"><button disabled={loading || pages.length === 1} onClick={() => { setLoading(true); setPages(p => p.slice(0, -1)) }} className="rounded-xl border border-line px-4 py-2 disabled:opacity-40">Previous</button><span className="text-sm text-muted">Page {pages.length} · Search and filters cover all records</span><button disabled={loading || !nextCursor} onClick={() => { setLoading(true); setPages(p => [...p, nextCursor]) }} className="rounded-xl border border-line px-4 py-2 disabled:opacity-40">Next</button></div>
        <div className="mt-4 hidden overflow-x-auto rounded-xl border border-line bg-bg md:block">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line text-xs font-semibold text-muted">
              <tr>
                {['Reference', 'Pickup', 'Customer', 'Service', 'Driver', 'Amount', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((b) => (
                <tr
                  key={b.ref}
                  onClick={() => open(b)}
                  className={`cursor-pointer transition-colors duration-150 ${selected?.ref === b.ref ? 'bg-surface' : 'hover:bg-surface/60'}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-heading">{b.ref}</td>
                  <td className="px-4 py-3 tabular-nums text-heading">{b.time}</td>
                  <td className="px-4 py-3 font-medium text-heading">{b.customer}</td>
                  <td className="px-4 py-3 text-text">{b.service}</td>
                  <td className="px-4 py-3">{b.driver ?? <span className="font-semibold text-error">Unassigned</span>}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-heading">{money(b.amount, b.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(b.status)}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && sheetOpen && <AdminModal title={`Booking ${selected.ref}`} onClose={() => { setSelected(null); setSheetOpen(false) }}><h3 className="font-display text-lg font-bold text-heading">{selected.route}</h3><AdminNotice message={saveMsg} /><BookingDetail booking={selected} drivers={drivers} onSave={save} onDelete={() => remove(selected.ref)} /></AdminModal>}

    </div>
  )
}

function BookingDetail({
  booking,
  drivers,
  onSave,
  onDelete,
}: {
  booking: OpsBooking
  drivers: DriverOption[]
  onSave: (patch: { status?: string; driverId?: string | null; notes?: string; pickupAddress?: string | null }) => void
  onDelete: () => void
}) {
  const [status, setStatus] = useState(booking.status)
  const [driverId, setDriverId] = useState('')
  const [notes, setNotes] = useState('')
  const [address, setAddress] = useState(booking.pickupAddress || '')

  useEffect(() => {
    setStatus(booking.status)
    setDriverId(booking.driverId || '')
    setNotes(booking.notes || '')
    setAddress(booking.pickupAddress || '')
  }, [booking])

  return (
    <>
      <span className={`mt-3 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(booking.status)}`}>{booking.status}</span>
      <dl className="mt-5 divide-y divide-line text-sm">
        {[
          ['Customer', booking.customer],
          ['Service', booking.service],
          ['Pickup', booking.time],
          ['Passengers', String(booking.pax)],
          ['Address', booking.pickupAddress || '—'],
          ['Vehicle', booking.vehicle],
          ['Total', `${money(booking.amount, booking.currency)} · ${booking.currency}`],
          ...(booking.flight ? [['Flight', booking.flight] as [string, string]] : []),
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-medium text-heading">{v}</dd>
          </div>
        ))}
      </dl>
      <label className="mt-5 block text-xs font-semibold text-muted">Driver</label>
      <select
        value={driverId}
        onChange={(e) => setDriverId(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2.5 text-sm text-heading"
      >
        <option value="">No driver assigned</option>
        {booking.driverId && !drivers.some(d => d.id === booking.driverId) && <option value={booking.driverId}>{booking.driver || 'Assigned driver (inactive)'}</option>}
        {drivers.map((d) => (
          <option key={d.id} value={d.id} disabled={['Off duty', 'Unavailable'].includes(d.status)}>
            {d.displayName}, {d.status}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-muted">Drivers on an overlapping journey are blocked by availability rules.</p>
      <label className="mt-4 block text-xs font-semibold text-muted">Status</label>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as OpsBooking['status'])}
        className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2.5 text-sm text-heading"
      >
        {['Pending', 'Awaiting Payment', 'Confirmed', 'Driver Assigned', 'Acknowledged', 'Driver En Route', 'In Progress', 'Completed', 'Cancelled', 'Refund Requested', ...(booking.status === 'Refunded' ? ['Refunded'] : [])].map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <label className="mt-4 block text-xs font-semibold text-muted">Pickup address</label>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Street or hotel the driver opens in Google Maps"
        className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading placeholder:text-muted"
      />
      <label className="mt-4 block text-xs font-semibold text-muted">Journey note</label>
      <textarea
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Visible to operations and the assigned driver"
        className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading placeholder:text-muted"
      />
      <div className="mt-5 flex gap-2">
        <AdminButton
          onClick={() =>
            onSave({
              status,
              driverId: driverId || null,
              notes,
              pickupAddress: address,
            })
          }
          className="flex-1 rounded-lg bg-primary py-3 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover xl:py-2.5"
        >
          Save changes
        </AdminButton>
        <AdminButton type="button" onClick={onDelete} className="whitespace-nowrap rounded-lg border border-line px-3 text-sm font-semibold text-error">
          Cancel booking
        </AdminButton>
      </div>
    </>
  )
}
