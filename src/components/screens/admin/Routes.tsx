'use client'

import { ReferenceCatalogueRestore } from '@/components/admin/ReferenceCatalogueRestore'
import React, { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { AdminButton, AdminEmpty, AdminForm, AdminModal, AdminNotice, AdminToggle, adminInput, adminRequest, useAdminConfirm } from '@/components/admin/AdminUI'

type RouteRow = { id: string; fromLabel: string; toLabel: string; fromIsk: number; active: boolean; returnTrip: boolean; km: number | null; minutes: number | null }
type Draft = { id?: string; fromLabel: string; toLabel: string; fromIsk: string; active: boolean; returnTrip: boolean }
const blank = (): Draft => ({ fromLabel: '', toLabel: '', fromIsk: '', active: false, returnTrip: true })
export function Routes() {
  const [rows, setRows] = useState<RouteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [viewing, setViewing] = useState<RouteRow | null>(null)
  const confirm = useAdminConfirm()
  const load = useCallback(async () => {
    setLoading(true)
    try { const data = await adminRequest<{ routes: RouteRow[] }>('/api/admin/routes'); setRows(data.routes); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load routes.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const edit = (row: RouteRow) => setDraft({ ...row, fromIsk: String(row.fromIsk) })
  const save = async () => {
    if (!draft) return
    await adminRequest(draft.id ? `/api/admin/routes/${draft.id}` : '/api/admin/routes', { method: draft.id ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fromLabel: draft.fromLabel.trim(), toLabel: draft.toLabel.trim(), fromIsk: Number(draft.fromIsk), active: draft.active, returnTrip: draft.returnTrip, override: true }) })
    setDraft(null); await load(); setMessage('Route saved.')
  }
  const remove = async (row: RouteRow) => {
    if (!await confirm({ title: 'Delete route?', description: `Remove ${row.fromLabel} → ${row.toLabel} from the catalogue? Existing bookings keep their journey details and prices.`, confirmLabel: 'Delete route', danger: true })) return
    await adminRequest(`/api/admin/routes/${row.id}`, { method: 'DELETE' }); await load(); setMessage('Route deleted. Booking history was retained.')
  }
  return <section className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">Manage locations and fixed prices. Checkout uses the published ISK price.</p><AdminButton type="button" onClick={() => setDraft(blank())} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary"><Plus size={16} /> New route</AdminButton></div><ReferenceCatalogueRestore onRestored={load} /><AdminNotice message={message} />{error && <div role="alert" className="text-sm text-error">{error}<AdminButton type="button" onClick={load} className="ml-3 underline">Try again</AdminButton></div>}
    {loading ? <p role="status" className="py-8 text-center text-sm text-muted">Loading routes…</p> : !rows.length && !error ? <AdminEmpty title="No routes yet" description="Add pickup and destination locations and a fixed price to make a route available for booking." action={<AdminButton type="button" onClick={() => setDraft(blank())} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary">Add route</AdminButton>} /> : <ul className="grid gap-4 sm:grid-cols-2">{rows.map(row => <li key={row.id} className="rounded-2xl border border-line bg-bg p-5"><h2 className="font-display font-bold text-heading">{row.fromLabel} → {row.toLabel}</h2><p className="mt-2 text-sm font-semibold text-heading">ISK {row.fromIsk.toLocaleString('en-US')}</p><p className="mt-1 text-xs text-muted">{row.minutes ? `${row.minutes} min` : 'Duration not set'} · {row.returnTrip ? 'Return trips offered' : 'One-way trips'}</p><div className="my-4"><AdminToggle label={row.active ? 'Available' : 'Paused'} checked={row.active} onChange={async active => { await adminRequest(`/api/admin/routes/${row.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active }) }); setRows(current => current.map(item => item.id === row.id ? { ...item, active } : item)); setMessage(active ? 'Route activated.' : 'Route paused.') }} /></div><div className="flex gap-3 border-t border-line pt-3"><AdminButton type="button" onClick={() => setViewing(row)} className="text-sm font-semibold text-link">View</AdminButton><AdminButton type="button" onClick={() => edit(row)} className="text-sm font-semibold text-link">Edit</AdminButton><AdminButton type="button" onClick={() => remove(row)} pendingLabel="Deleting…" className="ml-auto text-sm font-semibold text-error">Delete</AdminButton></div></li>)}</ul>}
    {draft && <AdminModal title={draft.id ? 'Edit route' : 'New route'} onClose={() => setDraft(null)}><AdminForm onSubmit={save} className="space-y-4"><label className="block text-sm font-semibold">Pickup location<input required value={draft.fromLabel} onChange={e => setDraft({ ...draft, fromLabel: e.target.value })} placeholder="Enter pickup location" className={adminInput} /></label><label className="block text-sm font-semibold">Destination<input required value={draft.toLabel} onChange={e => setDraft({ ...draft, toLabel: e.target.value })} placeholder="Enter destination" className={adminInput} /></label><label className="block text-sm font-semibold">Fixed price (ISK)<input required type="number" min={0} step={1} value={draft.fromIsk} onChange={e => setDraft({ ...draft, fromIsk: e.target.value })} className={adminInput} /></label><AdminToggle label="Available for booking" checked={draft.active} onChange={active => setDraft({ ...draft, active })} /><AdminToggle label="Offer a return trip" checked={draft.returnTrip} onChange={returnTrip => setDraft({ ...draft, returnTrip })} /><div className="flex justify-end gap-2 border-t border-line pt-4"><AdminButton type="button" onClick={() => setDraft(null)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold">Cancel</AdminButton><AdminButton type="submit" pendingLabel="Saving route…" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary">Save route</AdminButton></div></AdminForm></AdminModal>}
    {viewing && <AdminModal title="Route details" onClose={() => setViewing(null)}><h3 className="font-display text-lg font-bold">{viewing.fromLabel} → {viewing.toLabel}</h3><p className="mt-4 text-sm">ISK {viewing.fromIsk.toLocaleString('en-US')} · {viewing.active ? 'Available' : 'Paused'}</p><p className="mt-2 text-sm text-muted">{viewing.returnTrip ? 'Return trips are offered.' : 'One-way bookings only.'}</p><AdminButton type="button" onClick={() => { edit(viewing); setViewing(null) }} className="mt-6 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary">Edit route</AdminButton></AdminModal>}
  </section>
}
