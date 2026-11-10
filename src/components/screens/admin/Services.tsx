'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'

import { ISK_PER_USD } from '@/lib/design/data'

type Svc = {
  id: string
  slug: string
  name: string
  category: string
  model: string
  kind: string
  base: number
  min: number
  active: boolean
  hoursLabel: string
  paxLabel: string
  durations: { label: string; isk: number }[]
}

const KIND_META: Record<string, { category: string; model: string }> = {
  AIRPORT: { category: 'Airport transfer', model: 'Fixed route' },
  TAXI: { category: 'Private taxi', model: 'Fixed route' },
  TOUR: { category: 'Private tour', model: 'Package' },
  DRIVER: { category: 'Private driver', model: 'Hourly' },
  CUSTOM: { category: 'Special occasion', model: 'Custom quotation' },
}

const isk = (n: number) => `${n.toLocaleString('en-US').replace(/,/g, '.')} kr`

function mapService(s: {
  id: string
  slug: string
  kind: string
  titleEn: string
  fromIsk?: number | null
  hoursLabel?: string | null
  paxLabel?: string | null
  active: boolean
}): Svc {
  const meta = KIND_META[s.kind] || { category: s.kind, model: s.kind }
  const base = s.fromIsk ?? 0
  return {
    id: s.id,
    slug: s.slug,
    name: s.titleEn,
    category: meta.category,
    model: meta.model,
    kind: s.kind,
    base,
    min: base,
    active: s.active,
    hoursLabel: s.hoursLabel || '',
    paxLabel: s.paxLabel || '',
    durations: s.hoursLabel && base ? [{ label: s.hoursLabel, isk: base }] : [],
  }
}

export function Services() {
  const [list, setList] = useState<Svc[]>([])
  const [selId, setSelId] = useState<string>('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [kindFilter, setKindFilter] = useState('ALL')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', kind: 'AIRPORT', fromIsk: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/services')
      const data = await res.json()
      if (!data.ok) {
        setMsg(data.message || 'Could not load services')
        setList([])
        return
      }
      const mapped = (data.services as Parameters<typeof mapService>[0][]).map(mapService)
      setList(mapped)
      setSelId((prev) => prev || mapped[0]?.id || '')
      setMsg(null)
    } catch (e) {
      console.error(e)
      setMsg('Failed to load services')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sel = list.find((s) => s.id === selId) ?? list[0]
  const update = (patch: Partial<Svc>) => setList((l) => l.map((s) => (s.id === sel?.id ? { ...s, ...patch } : s)))

  const publish = async () => {
    if (!sel) return
    setMsg(null)
    const res = await fetch(`/api/admin/services/${sel.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titleEn: sel.name,
        fromIsk: sel.base || null,
        hoursLabel: sel.hoursLabel || null,
        paxLabel: sel.paxLabel || null,
        active: sel.active,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      setMsg(data.message || 'Publish failed')
      return
    }
    setMsg('Published')
    await load()
  }

  const deactivate = async () => {
    if (!sel) return
    const res = await fetch(`/api/admin/services/${sel.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      setMsg(data.message || 'Delete failed')
      return
    }
    setMsg('Hidden from website')
    await load()
  }

  const create = async () => {
    const slug = draft.name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'service'
    const res = await fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug,
        kind: draft.kind,
        titleEn: draft.name,
        fromIsk: draft.fromIsk ? Number(draft.fromIsk) : undefined,
        active: true,
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      setMsg(data?.message || 'Could not save the service')
      return
    }
    setCreating(false)
    setDraft({ name: '', kind: kindFilter === 'ALL' ? 'AIRPORT' : kindFilter, fromIsk: '' })
    setMsg('Saved')
    await load()
    if (data.service?.id) setSelId(data.service.id)
  }

  const visible = list.filter((item) => kindFilter === 'ALL' || item.kind === kindFilter)

  if (!sel) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-sm text-muted">{loading ? 'Loading services…' : msg || 'No services yet. Add one to save it.'}</p>
        {!loading && (
          <form onSubmit={(event) => { event.preventDefault(); create() }} className="mt-4 grid gap-2">
            <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Service name" className="w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted focus:border-focus" />
            <select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value })} className="w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus">
              <option value="AIRPORT">Airport transfer</option>
              <option value="TAXI">Private taxi</option>
              <option value="TOUR">Private tour</option>
              <option value="DRIVER">Private driver</option>
              <option value="CUSTOM">Special occasion</option>
            </select>
            <input value={draft.fromIsk} onChange={(event) => setDraft({ ...draft, fromIsk: event.target.value })} inputMode="numeric" placeholder="From price in ISK" className="w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted focus:border-focus" />
            <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary">Save service</button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="grid min-h-0 lg:h-full lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
      <div className="min-h-0 border-b border-line bg-bg lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-heading">{visible.length} services{msg ? ` · ${msg}` : ''}</p>
          <button onClick={() => { setCreating(true); setDraft({ name: '', kind: kindFilter === 'ALL' ? 'TOUR' : kindFilter, fromIsk: '' }) }} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-on-primary"><Plus size={15} /> New</button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {[['ALL', 'All'], ['AIRPORT', 'Airport'], ['TAXI', 'Taxi'], ['TOUR', 'Tours'], ['DRIVER', 'Driver'], ['CUSTOM', 'Custom']].map(([id, label]) => (
            <button key={id} onClick={() => setKindFilter(id)} className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${kindFilter === id ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted'}`}>{label}</button>
          ))}
        </div>
        {creating && (
          <form onSubmit={(event) => { event.preventDefault(); create() }} className="grid gap-2 border-b border-line p-3">
            <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Service name" className="w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted focus:border-focus" />
            <select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value })} className="w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus">
              <option value="AIRPORT">Airport transfer</option>
              <option value="TAXI">Private taxi</option>
              <option value="TOUR">Private tour</option>
              <option value="DRIVER">Private driver</option>
              <option value="CUSTOM">Special occasion</option>
            </select>
            <input value={draft.fromIsk} onChange={(event) => setDraft({ ...draft, fromIsk: event.target.value })} inputMode="numeric" placeholder="From price in ISK" className="w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted focus:border-focus" />
            <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary">Save service</button>
          </form>
        )}
        <ul className="divide-y divide-line">
          {visible.map((s) => (
            <li key={s.id}>
              <button onClick={() => setSelId(s.id)} className={`w-full px-4 py-3 text-left transition-colors duration-150 ${s.id === sel.id ? 'bg-surface' : 'hover:bg-surface/60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-heading">{s.name}</p>
                  <span className={`shrink-0 text-[11px] font-semibold ${s.active ? 'text-success' : 'text-muted'}`}>{s.active ? 'Live' : 'Hidden'}</span>
                </div>
                <p className="text-xs text-muted">{s.category} · {s.model}{s.base ? ` · from ${isk(s.min)}` : ''}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="min-h-0 p-3 sm:p-6 lg:overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-heading sm:text-2xl">{sel.name}</h2>
              <p className="text-sm text-muted">Changes go live on the website when published. Confirmed bookings keep their original price.</p>
            </div>
            <div className="flex gap-2">
              <button
                aria-label="Duplicate"
                onClick={async () => {
                  const res = await fetch('/api/admin/services', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ slug: `${sel.slug}-copy`, kind: sel.kind, titleEn: `${sel.name} copy`, fromIsk: sel.base || undefined, active: false }),
                  })
                  const data = await res.json().catch(() => null)
                  if (!res.ok || !data?.ok) {
                    setMsg(data?.message || 'Could not duplicate the service')
                    return
                  }
                  setMsg('Saved')
                  await load()
                }}
                className="grid h-9 w-9 place-items-center rounded-lg border border-line text-heading"
              >
                <Copy size={15} />
              </button>
              <button aria-label="Delete" onClick={deactivate} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-error"><Trash2 size={15} /></button>
              <label className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-heading">
                <input type="checkbox" checked={sel.active} onChange={(e) => update({ active: e.target.checked })} className="h-4 w-4 accent-[var(--mint)]" /> Active
              </label>
            </div>
          </div>

          <Panel title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-muted">Service name</span>
                <input value={sel.name} onChange={(e) => update({ name: e.target.value })} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus" />
              </label>
              <Select label="Category" value={sel.category} options={['Airport transfer', 'Private taxi', 'Private tour', 'Private driver', 'Hotel & port', 'Corporate', 'Special occasion']} />
              <Select label="Pricing model" value={sel.model} options={['Fixed route', 'Per kilometre', 'Hourly', 'Half-day', 'Full-day', 'Per passenger', 'Vehicle-based', 'Package', 'Multi-day', 'Custom quotation']} />
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-muted">Passenger label</span>
                <input value={sel.paxLabel} onChange={(e) => update({ paxLabel: e.target.value })} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus" />
              </label>
            </div>
          </Panel>

          {sel.model !== 'Custom quotation' && (
            <Panel title="Price & durations" hint={`Prices are set in ISK. USD shown at today's rate (1 USD = ${ISK_PER_USD} ISK) unless overridden.`}>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block min-w-0">
                  <span className="text-xs font-semibold text-muted">Base price (ISK)</span>
                  <input type="number" value={sel.base} onChange={(e) => update({ base: Number(e.target.value) || 0, min: Number(e.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus" />
                </label>
                <Input label="Minimum price (ISK)" value={String(sel.min)} />
                <Input label="USD override" value="" placeholder={`Auto · $${Math.round(sel.base / ISK_PER_USD) || 0}`} />
              </div>
              <label className="mt-4 block min-w-0">
                <span className="text-xs font-semibold text-muted">Duration label</span>
                <input value={sel.hoursLabel} onChange={(e) => update({ hoursLabel: e.target.value })} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus" />
              </label>
              <table className="mt-5 w-full text-left text-sm">
                <thead className="text-xs font-semibold text-muted">
                  <tr><th className="pb-2">Duration option</th><th className="pb-2">ISK</th><th className="pb-2">USD</th><th /></tr>
                </thead>
                <tbody className="divide-y divide-line border-t border-line">
                  {(sel.durations.length ? sel.durations : [{ label: sel.hoursLabel || 'Base', isk: sel.base }]).map((d) => (
                    <tr key={d.label}>
                      <td className="py-2.5 font-medium text-heading">{d.label || 'Base'}</td>
                      <td className="py-2.5 tabular-nums text-text">{isk(d.isk)}</td>
                      <td className="py-2.5 tabular-nums text-muted">${Math.round(d.isk / ISK_PER_USD) || 0}</td>
                      <td className="py-2.5 text-right"><button className="text-xs font-semibold text-link">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-link"><Plus size={14} /> Add duration option</button>
            </Panel>
          )}

          <Panel title="Charges & surcharges">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Extra passenger" value="2.500 kr" />
              <Input label="Extra hour" value="14.900 kr" />
              <Input label="Extra km" value="350 kr" />
              <Input label="Waiting time / 15 min" value="2.000 kr" />
              <Input label="Extra luggage / item" value="1.500 kr" />
              <Input label="Child seat" value="2.500 kr" />
              <Input label="Night (22:00–06:00)" value="15%" />
              <Input label="Weekend" value="0%" />
              <Input label="Public holiday" value="25%" />
              <Input label="Return discount" value="10%" />
              <Input label="VAT" value="11% included" />
              <Input label="Deposit" value="None, full payment" />
            </div>
          </Panel>

          <Panel title="Booking rules">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Minimum notice" value="3 hours" />
              <Input label="Max. advance booking" value="12 months" />
              <Input label="Buffer between journeys" value="30 min" />
              <Select label="Vehicle requirement" value="Any with enough seats" options={['Any with enough seats', 'SUV or larger', 'Premium only']} />
              <Select label="Cancellation rule" value="Free until 24 h before" options={['Free until 24 h before', 'Free until 48 h before', 'Non-refundable']} />
              <Select label="Booking form" value="Airport (flight number)" options={['Standard', 'Airport (flight number)', 'Tour (itinerary)', 'Quotation request']} />
            </div>
          </Panel>

          <div className="flex justify-end gap-2 pb-6">
            <button onClick={load} className="rounded-lg border border-line bg-bg px-4 py-2.5 text-sm font-semibold text-heading">Reload</button>
            <button onClick={publish} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">Publish</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-bg p-4 sm:p-5">
      <h3 className="font-display text-base font-bold text-heading">{title}</h3>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function Input({ label, value, placeholder }: { label: string; value: string; placeholder?: string }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <input key={value} defaultValue={value} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted focus:border-focus" />
    </label>
  )
}

export function Select({ label, value, options }: { label: string; value: string; options: string[] }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <select key={value} defaultValue={value} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  )
}
