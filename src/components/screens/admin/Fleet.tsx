import React from 'react'
import { Plus } from 'lucide-react'

const DRIVERS = [
  { name: 'Gunnar Helgason', type: 'Employed', licence: 'B, D1 · exp. 2028', vehicle: 'Comfort Sedan · RX-482', status: 'On trip', today: 3, active: true },
  { name: 'Sigrún Baldursdóttir', type: 'Employed', licence: 'B · exp. 2027', vehicle: 'SUV · KL-115', status: 'On trip', today: 1, active: true },
  { name: 'Ari Þórsson', type: 'Employed', licence: 'B · exp. 2029', vehicle: 'SUV · PT-903', status: 'Available', today: 3, active: true },
  { name: 'Katrín Einarsdóttir', type: 'Contracted', licence: 'B, D · exp. 2026', vehicle: 'Minivan · MV-220', status: 'Available', today: 0, active: true },
  { name: 'Ólafur Stefánsson', type: 'Employed', licence: 'B · exp. 2027', vehicle: 'Premium Sedan · BS-771', status: 'Off duty', today: 0, active: false },
]

const VEHICLES = [
  { name: 'Toyota Camry', cat: 'Standard Sedan', reg: 'ST-310', pax: 3, bags: 3, status: 'Available', driver: '—', adj: '0%' },
  { name: 'Mercedes E-Class', cat: 'Comfort Sedan', reg: 'RX-482', pax: 3, bags: 3, status: 'In use', driver: 'Gunnar H.', adj: '+0%' },
  { name: 'Mercedes S-Class', cat: 'Premium Sedan', reg: 'BS-771', pax: 3, bags: 2, status: 'Maintenance', driver: 'Ólafur S.', adj: '+26%' },
  { name: 'Volvo XC90', cat: 'SUV', reg: 'PT-903', pax: 4, bags: 4, status: 'In use', driver: 'Ari Þ.', adj: '+35%' },
  { name: 'Land Rover Defender', cat: 'SUV', reg: 'KL-115', pax: 4, bags: 4, status: 'In use', driver: 'Sigrún B.', adj: '+35%' },
  { name: 'Mercedes V-Class', cat: 'Minivan', reg: 'MV-220', pax: 7, bags: 7, status: 'Available', driver: 'Katrín E.', adj: '+52%' },
  { name: 'Mercedes Sprinter', cat: 'Minibus', reg: 'MB-019', pax: 16, bags: 16, status: 'Available', driver: '—', adj: '+120%' },
]

const dot = (s: string) => (s === 'Available' ? 'bg-mint' : s === 'On trip' || s === 'In use' ? 'bg-cyan' : s === 'Maintenance' ? 'bg-primary' : 'bg-muted')

export function Fleet({ view }: { view: 'drivers' | 'vehicles' }) {
  return (
    <div className="mx-auto max-w-[1400px] p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{view === 'drivers' ? 'Drivers cannot be assigned to overlapping journeys. Availability includes a 30-minute buffer.' : 'Vehicle price adjustments apply on top of each service price.'}</p>
        <button className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-on-primary"><Plus size={15} /> {view === 'drivers' ? 'Add driver' : 'Add vehicle'}</button>
      </div>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg md:hidden">
        {view === 'drivers'
          ? DRIVERS.map((d) => (
              <li key={d.name} className="flex items-center gap-3 px-4 py-3.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold text-heading">{d.name.split(' ').map((s) => s[0]).join('')}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-heading">{d.name}</p>
                  <p className="truncate text-xs text-muted">{d.vehicle} · {d.type}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-text"><span className={`h-2 w-2 rounded-full ${dot(d.status)}`} />{d.status} · {d.today} today</p>
                </div>
                <button className="shrink-0 text-xs font-semibold text-link">Schedule</button>
              </li>
            ))
          : VEHICLES.map((v) => (
              <li key={v.reg} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-heading">{v.name} <span className="font-mono text-xs font-normal text-muted">{v.reg}</span></p>
                  <p className="truncate text-xs text-muted">{v.cat} · {v.pax} seats · {v.bags} bags · {v.driver}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-text"><span className={`h-2 w-2 rounded-full ${dot(v.status)}`} />{v.status}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-heading">{v.adj}</p>
              </li>
            ))}
      </ul>
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-line bg-bg md:block">
        {view === 'drivers' ? (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line text-xs font-semibold text-muted">
              <tr>{['Driver', 'Type', 'Licence', 'Vehicle', 'Status', 'Today', 'Account', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {DRIVERS.map((d) => (
                <tr key={d.name}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-surface text-xs font-bold text-heading">{d.name.split(' ').map((s) => s[0]).join('')}</div>
                      <span className="font-medium text-heading">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text">{d.type}</td>
                  <td className="px-4 py-3 text-text">{d.licence}</td>
                  <td className="px-4 py-3 text-text">{d.vehicle}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-text"><span className={`h-2 w-2 rounded-full ${dot(d.status)}`} />{d.status}</span></td>
                  <td className="px-4 py-3 tabular-nums text-text">{d.today} journeys</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold ${d.active ? 'text-success' : 'text-muted'}`}>{d.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-right"><button className="text-xs font-semibold text-link">Schedule</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line text-xs font-semibold text-muted">
              <tr>{['Vehicle', 'Category', 'Registration', 'Seats', 'Bags', 'Status', 'Driver', 'Price adj.'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {VEHICLES.map((v) => (
                <tr key={v.reg}>
                  <td className="px-4 py-3 font-medium text-heading">{v.name}</td>
                  <td className="px-4 py-3 text-text">{v.cat}</td>
                  <td className="px-4 py-3 font-mono text-xs text-heading">{v.reg}</td>
                  <td className="px-4 py-3 tabular-nums text-text">{v.pax}</td>
                  <td className="px-4 py-3 tabular-nums text-text">{v.bags}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-text"><span className={`h-2 w-2 rounded-full ${dot(v.status)}`} />{v.status}</span></td>
                  <td className="px-4 py-3 text-text">{v.driver}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-heading">{v.adj}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
