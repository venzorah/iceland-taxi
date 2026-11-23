'use client'

import { ReferenceCatalogueRestore } from '@/components/admin/ReferenceCatalogueRestore'
import React, { useCallback, useEffect, useState } from 'react'
import { Copy, Plus, Trash2, Pencil, Eye } from 'lucide-react'
import { AdminButton, AdminEmpty, AdminForm, AdminModal, AdminNotice, AdminToggle, adminInput, adminRequest, useAdminConfirm } from '@/components/admin/AdminUI'
// Service image uploads are intentionally disabled for now. Existing images are retained.
// import { ImageField } from './ImageField'

type Service = { id: string; slug: string; kind: string; titleEn: string; fromIsk: number | null; active: boolean; hoursLabel: string | null; paxLabel: string | null }
const kinds: Record<string, string> = { AIRPORT: 'Airport transfer', TAXI: 'Private taxi', TOUR: 'Private tour', DRIVER: 'Private driver', CUSTOM: 'Special occasion' }
type Draft = { id?: string; titleEn: string; kind: string; fromIsk: string; hoursLabel: string; paxLabel: string; active: boolean }
const blank = (): Draft => ({ titleEn: '', kind: 'AIRPORT', fromIsk: '', hoursLabel: '', paxLabel: '', active: false })

export function Services() {
  const [rows, setRows] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [viewing, setViewing] = useState<Service | null>(null)
  const confirm = useAdminConfirm()
  const load = useCallback(async () => {
    setLoading(true)
    try { const data = await adminRequest<{ services: Service[] }>('/api/admin/services'); setRows(data.services); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load services.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const edit = (service: Service) => setDraft({ ...service, fromIsk: service.fromIsk === null ? '' : String(service.fromIsk), hoursLabel: service.hoursLabel || '', paxLabel: service.paxLabel || '' })
  const save = async () => {
    if (!draft) return
    const slug = draft.titleEn.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'service'
    const payload = { titleEn: draft.titleEn.trim(), kind: draft.kind, fromIsk: draft.fromIsk === '' ? (draft.id ? null : undefined) : Number(draft.fromIsk), hoursLabel: draft.hoursLabel || (draft.id ? null : undefined), paxLabel: draft.paxLabel || (draft.id ? null : undefined), active: draft.active, ...(!draft.id ? { slug: `${slug}-${Date.now().toString(36)}` } : {}) }
    await adminRequest(draft.id ? `/api/admin/services/${draft.id}` : '/api/admin/services', { method: draft.id ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    setDraft(null); await load(); setNotice(draft.active ? 'Service published.' : 'Service saved as hidden.')
  }
  const remove = async (service: Service) => {
    if (!await confirm({ title: 'Delete service?', description: `Remove “${service.titleEn}” from the catalogue? Existing bookings keep their saved service details and prices. Linked routes are retained.`, confirmLabel: 'Delete service', danger: true })) return
    await adminRequest(`/api/admin/services/${service.id}`, { method: 'DELETE' })
    await load(); setNotice('Service deleted. Booking history was retained.')
  }
  const visible = rows.filter(row => filter === 'ALL' || row.kind === filter)
  return <section className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">Manage published services and fixed prices. Saved bookings retain their original prices.</p><AdminButton type="button" onClick={() => setDraft(blank())} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary"><Plus size={16} /> New service</AdminButton></div>
    <ReferenceCatalogueRestore onRestored={load} /><AdminNotice message={notice} />
    {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-error/30 p-4 text-sm text-error">{error}<AdminButton type="button" onClick={load} pendingLabel="Loading…" className="font-semibold underline">Try again</AdminButton></div>}
    <label className="block max-w-xs text-sm font-semibold text-heading">Category<select value={filter} onChange={e => setFilter(e.target.value)} className={adminInput}><option value="ALL">All services</option>{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {loading ? <p role="status" className="py-8 text-center text-sm text-muted">Loading services…</p> : !error && !visible.length ? <AdminEmpty title={rows.length ? 'No services in this category' : 'No services yet'} description="Add a service with its name and price. Publish it when it is ready for customers." action={<AdminButton type="button" onClick={() => setDraft({ ...blank(), kind: filter === 'ALL' ? 'AIRPORT' : filter })} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary">Add service</AdminButton>} /> : <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(service => <li key={service.id} className="flex flex-col rounded-2xl border border-line bg-bg p-5"><p className="text-xs font-semibold text-muted">{kinds[service.kind] || service.kind}</p><h2 className="mt-2 font-display text-lg font-bold text-heading">{service.titleEn}</h2><p className="mt-2 text-sm text-muted">{service.fromIsk === null ? 'Price not set' : `ISK ${service.fromIsk.toLocaleString('en-US')}`}</p><div className="my-4"><AdminToggle label={service.active ? 'Published' : 'Hidden'} checked={service.active} onChange={async active => { await adminRequest(`/api/admin/services/${service.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active }) }); setRows(current => current.map(row => row.id === service.id ? { ...row, active } : row)); setNotice(active ? 'Service published.' : 'Service hidden.') }} /></div><div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3"><AdminButton type="button" onClick={() => setViewing(service)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-2 text-xs font-semibold"><Eye size={14} /> View</AdminButton><AdminButton type="button" onClick={() => edit(service)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-2 text-xs font-semibold"><Pencil size={14} /> Edit</AdminButton><AdminButton type="button" aria-label={`Duplicate ${service.titleEn}`} pendingLabel="Duplicating…" onClick={async () => { await adminRequest('/api/admin/services', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: `${service.slug}-copy-${Date.now().toString(36)}`, kind: service.kind, titleEn: `${service.titleEn} copy`, fromIsk: service.fromIsk ?? undefined, active: false }) }); await load(); setNotice('Service duplicated as hidden.') }} className="rounded-lg border border-line p-2 text-heading"><Copy size={14} /></AdminButton><AdminButton type="button" aria-label={`Delete ${service.titleEn}`} pendingLabel="Deleting…" onClick={() => remove(service)} className="ml-auto rounded-lg border border-line p-2 text-error"><Trash2 size={14} /></AdminButton></div></li>)}</ul>}
    {draft && <AdminModal title={draft.id ? 'Edit service' : 'New service'} onClose={() => setDraft(null)}><AdminForm onSubmit={save} className="space-y-4"><label className="block text-sm font-semibold">Service name<input required maxLength={150} value={draft.titleEn} onChange={e => setDraft({ ...draft, titleEn: e.target.value })} placeholder="Enter the service name" className={adminInput} /></label><label className="block text-sm font-semibold">Category<select value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value })} className={adminInput}>{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm font-semibold">From price (ISK)<input required={draft.active} type="number" min={1} step={1} value={draft.fromIsk} onChange={e => setDraft({ ...draft, fromIsk: e.target.value })} placeholder="Enter a fixed price" className={adminInput} /></label><label className="block text-sm font-semibold">Duration label<input value={draft.hoursLabel} onChange={e => setDraft({ ...draft, hoursLabel: e.target.value })} placeholder="For example, 3 hours" className={adminInput} /></label><label className="block text-sm font-semibold">Passenger label<input value={draft.paxLabel} onChange={e => setDraft({ ...draft, paxLabel: e.target.value })} placeholder="For example, up to 4 passengers" className={adminInput} /></label><AdminToggle label="Publish on the website" checked={draft.active} onChange={active => setDraft({ ...draft, active })} /><div className="flex justify-end gap-2 border-t border-line pt-4"><AdminButton type="button" onClick={() => setDraft(null)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold">Cancel</AdminButton><AdminButton type="submit" pendingLabel={draft.active ? 'Publishing…' : 'Saving…'} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary">{draft.active ? 'Publish service' : 'Save service'}</AdminButton></div></AdminForm></AdminModal>}
    {viewing && <AdminModal title={viewing.titleEn} onClose={() => setViewing(null)}><dl className="space-y-4 text-sm">{[['Category', kinds[viewing.kind]], ['Status', viewing.active ? 'Published' : 'Hidden'], ['From price', viewing.fromIsk === null ? 'Not set' : `ISK ${viewing.fromIsk.toLocaleString('en-US')}`], ['Duration', viewing.hoursLabel || 'Not set'], ['Passengers', viewing.paxLabel || 'Not set']].map(([label, value]) => <div key={label}><dt className="text-muted">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl><AdminButton type="button" onClick={() => { edit(viewing); setViewing(null) }} className="mt-6 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary">Edit service</AdminButton></AdminModal>}
  </section>
}

export function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-line bg-bg p-4 sm:p-5"><h3 className="font-display text-base font-bold text-heading">{title}</h3>{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}<div className="mt-4">{children}</div></section>
}
export function Input({ label, value, placeholder }: { label: string; value: string; placeholder?: string }) {
  return <label className="block min-w-0"><span className="text-xs font-semibold text-muted">{label}</span><input readOnly value={value} placeholder={placeholder} className={`${adminInput} opacity-70`} /></label>
}
export function Select({ label, value, options }: { label: string; value: string; options: string[] }) {
  return <label className="block min-w-0"><span className="text-xs font-semibold text-muted">{label}</span><select disabled value={value} className={adminInput}>{options.map(option => <option key={option}>{option}</option>)}</select></label>
}
