import React, { useState } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'

import { ISK_PER_USD } from '@shared/data'

type Svc = { id: string; name: string; category: string; model: string; base: number; min: number; active: boolean; durations: { label: string; isk: number }[] }

const SEED: Svc[] = [
  { id: 'kef-rvk', name: 'Keflavík Airport → Reykjavík', category: 'Airport transfer', model: 'Fixed route', base: 22900, min: 22900, active: true, durations: [{ label: '45 min (estimated)', isk: 22900 }] },
  { id: 'golden', name: 'Golden Circle Private Tour', category: 'Private tour', model: 'Package', base: 89900, min: 89900, active: true, durations: [{ label: '7 hours', isk: 89900 }, { label: '9 hours (with Secret Lagoon)', isk: 104900 }] },
  { id: 'driver', name: 'Private vacation driver', category: 'Private driver', model: 'Hourly', base: 14900, min: 29800, active: true, durations: [{ label: '2 hours', isk: 29800 }, { label: '4 hours', isk: 56900 }, { label: '8 hours', isk: 109900 }, { label: '12 hours', isk: 159900 }, { label: 'Multi-day (per day)', isk: 129900 }] },
  { id: 'nl', name: 'Northern Lights Experience', category: 'Private tour', model: 'Package', base: 59900, min: 59900, active: true, durations: [{ label: '4 hours', isk: 59900 }] },
  { id: 'cruise', name: 'Cruise port transfer', category: 'Hotel & port', model: 'Fixed route', base: 9900, min: 9900, active: false, durations: [{ label: '15 min (estimated)', isk: 9900 }] },
  { id: 'wedding', name: 'Wedding transportation', category: 'Special occasion', model: 'Custom quotation', base: 0, min: 0, active: true, durations: [] },
]

const isk = (n: number) => `${n.toLocaleString('en-US').replace(/,/g, '.')} kr`

export function Services() {
  const [list, setList] = useState(SEED)
  const [selId, setSelId] = useState(SEED[2].id)
  const sel = list.find((s) => s.id === selId) ?? list[0]
  const update = (patch: Partial<Svc>) => setList((l) => l.map((s) => (s.id === sel.id ? { ...s, ...patch } : s)))

  return (
    <div className="grid min-h-0 lg:h-full lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
      <div className="min-h-0 border-b border-line bg-bg lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-heading">{list.length} services</p>
          <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-on-primary"><Plus size={15} /> New</button>
        </div>
        <ul className="divide-y divide-line">
          {list.map((s) => (
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
              <button aria-label="Duplicate" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-heading"><Copy size={15} /></button>
              <button aria-label="Delete" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-error"><Trash2 size={15} /></button>
              <label className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-heading">
                <input type="checkbox" checked={sel.active} onChange={(e) => update({ active: e.target.checked })} className="h-4 w-4 accent-[var(--mint)]" /> Active
              </label>
            </div>
          </div>

          <Panel title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Service name" value={sel.name} />
              <Select label="Category" value={sel.category} options={['Airport transfer', 'Private taxi', 'Private tour', 'Private driver', 'Hotel & port', 'Corporate', 'Special occasion']} />
              <Select label="Pricing model" value={sel.model} options={['Fixed route', 'Per kilometre', 'Hourly', 'Half-day', 'Full-day', 'Per passenger', 'Vehicle-based', 'Package', 'Multi-day', 'Custom quotation']} />
              <Input label="Passenger limit" value="8" />
            </div>
          </Panel>

          {sel.model !== 'Custom quotation' && (
            <Panel title="Price & durations" hint={`Prices are set in ISK. USD shown at today's rate (1 USD = ${ISK_PER_USD} ISK) unless overridden.`}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Base price (ISK)" value={String(sel.base)} />
                <Input label="Minimum price (ISK)" value={String(sel.min)} />
                <Input label="USD override" value="" placeholder={`Auto · $${Math.round(sel.base / ISK_PER_USD)}`} />
              </div>
              <table className="mt-5 w-full text-left text-sm">
                <thead className="text-xs font-semibold text-muted">
                  <tr><th className="pb-2">Duration option</th><th className="pb-2">ISK</th><th className="pb-2">USD</th><th /></tr>
                </thead>
                <tbody className="divide-y divide-line border-t border-line">
                  {sel.durations.map((d) => (
                    <tr key={d.label}>
                      <td className="py-2.5 font-medium text-heading">{d.label}</td>
                      <td className="py-2.5 tabular-nums text-text">{isk(d.isk)}</td>
                      <td className="py-2.5 tabular-nums text-muted">${Math.round(d.isk / ISK_PER_USD)}</td>
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
              <Input label="Deposit" value="None — full payment" />
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
            <button className="rounded-lg border border-line bg-bg px-4 py-2.5 text-sm font-semibold text-heading">Save draft</button>
            <button className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">Publish</button>
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
