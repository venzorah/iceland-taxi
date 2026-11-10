import React from 'react'
import { ArrowLeftRight, Plus } from 'lucide-react'

const ROUTES = [
  { from: 'Keflavík Airport (KEF)', to: 'Reykjavík city centre', km: 49, min: 45, isk: 22900, ret: true, on: true, override: false },
  { from: 'Keflavík Airport (KEF)', to: 'Blue Lagoon', km: 23, min: 20, isk: 14900, ret: true, on: true, override: false },
  { from: 'Blue Lagoon', to: 'Reykjavík city centre', km: 47, min: 45, isk: 21900, ret: true, on: true, override: false },
  { from: 'Keflavík Airport (KEF)', to: 'Selfoss', km: 100, min: 75, isk: 39900, ret: false, on: true, override: true },
  { from: 'Reykjavík Airport (RKV)', to: 'Reykjavík city centre', km: 3, min: 10, isk: 6900, ret: true, on: true, override: false },
  { from: 'Skarfabakki cruise port', to: 'Reykjavík city centre', km: 6, min: 15, isk: 9900, ret: true, on: false, override: false },
  { from: 'Keflavík Airport (KEF)', to: 'Vík', km: 225, min: 180, isk: 89900, ret: false, on: true, override: true },
]

export function Routes() {
  return (
    <div className="mx-auto max-w-[1400px] p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Fixed-price routes. Distance and duration are calculated from the map and can be overridden.</p>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-on-primary"><Plus size={15} /> New route</button>
      </div>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg md:hidden">
        {ROUTES.map((r) => (
          <li key={r.from + r.to} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-heading">{r.from}</p>
                <p className="text-sm font-semibold text-heading">→ {r.to}</p>
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums text-heading">{r.isk.toLocaleString('en-US').replace(/,/g, '.')} kr</p>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="tabular-nums">{r.km} km · {r.min} min</span>
              {r.override && <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">Manual</span>}
              <span className={`font-semibold ${r.on ? 'text-success' : 'text-muted'}`}>{r.on ? 'Available' : 'Paused'}</span>
              {r.ret ? <span className="inline-flex items-center gap-1"><ArrowLeftRight size={12} /> Return linked</span> : <button className="font-semibold text-link">Create return</button>}
              <button className="ml-auto font-semibold text-link">Edit</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-line bg-bg md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line text-xs font-semibold text-muted">
            <tr>{['From', 'To', 'Distance', 'Duration', 'Price', 'Return route', 'Status', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ROUTES.map((r) => (
              <tr key={r.from + r.to}>
                <td className="px-4 py-3 font-medium text-heading">{r.from}</td>
                <td className="px-4 py-3 font-medium text-heading">{r.to}</td>
                <td className="px-4 py-3 tabular-nums text-text">{r.km} km</td>
                <td className="px-4 py-3 tabular-nums text-text">
                  {r.min} min{r.override && <span className="ml-1.5 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">Manual</span>}
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold text-heading">{r.isk.toLocaleString('en-US').replace(/,/g, '.')} kr</td>
                <td className="px-4 py-3">{r.ret ? <span className="inline-flex items-center gap-1 text-text"><ArrowLeftRight size={13} /> Linked</span> : <button className="text-xs font-semibold text-link">Create return</button>}</td>
                <td className="px-4 py-3"><span className={`text-xs font-semibold ${r.on ? 'text-success' : 'text-muted'}`}>{r.on ? 'Available' : 'Paused'}</span></td>
                <td className="px-4 py-3 text-right"><button className="text-xs font-semibold text-link">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Map autocomplete, distance and duration calculation connect to Google Maps or Mapbox once an API key is added in System settings.</p>
    </div>
  )
}
