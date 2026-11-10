'use client'

import React, { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Input, Panel, Select } from './Services'

const SEASONS = [
  { name: 'Peak summer', range: '15 Jun – 31 Aug', adj: '+10%' },
  { name: 'Aurora season', range: '1 Oct – 31 Mar', adj: '0%' },
  { name: 'Christmas & New Year', range: '20 Dec – 2 Jan', adj: '+25%' },
]

export function Pricing() {
  const [rate, setRate] = useState(138)
  const [usd, setUsd] = useState(true)
  const [isk, setIsk] = useState(true)

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:space-y-6 sm:p-6">
      <Panel title="Currencies" hint="Customers see the transaction currency before paying, and are charged in exactly that currency.">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            {([['USD', 'US dollar · default for international visitors', usd, setUsd], ['ISK', 'Icelandic króna · residents only', isk, setIsk]] as const).map(([code, label, on, set]) => (
              <label key={code} className="flex items-center justify-between rounded-lg border border-line p-3">
                <span>
                  <span className="block text-sm font-semibold text-heading">{code}</span>
                  <span className="block text-xs text-muted">{label}</span>
                </span>
                <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="h-5 w-5 accent-[var(--mint)]" />
              </label>
            ))}
            <Select label="Default currency" value="USD" options={['USD', 'ISK']} />
          </div>
          <div>
            <label className="block">
              <span className="text-xs font-semibold text-muted">Exchange rate · ISK per 1 USD</span>
              <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 font-display text-2xl font-bold text-heading outline-none focus:border-focus" />
            </label>
            <p className="mt-2 text-xs text-muted">Set manually · last changed 12 Mar by Demo admin</p>
            <div className="mt-4 rounded-lg bg-surface p-4 text-sm">
              <p className="text-muted">Example: KEF → Reykjavík, 22.900 kr</p>
              <p className="mt-1 font-display text-xl font-bold text-heading">${Math.round(22900 / (rate || 1))} USD</p>
            </div>
            <div className="mt-4 flex gap-2 rounded-lg border border-line p-3 text-xs text-text">
              <AlertTriangle size={16} className="shrink-0 text-warning" />
              Confirm your payment provider supports charging in both USD and ISK, and your payout currency, before enabling a currency.
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Global surcharges" hint="Apply to every service unless a service sets its own.">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Input label="Night (22:00–06:00)" value="15%" />
          <Input label="Weekend" value="0%" />
          <Input label="Public holiday" value="25%" />
          <Input label="Return discount" value="10%" />
        </div>
      </Panel>

      <Panel title="Seasonal pricing">
        <table className="w-full text-left text-sm">
          <thead className="text-xs font-semibold text-muted"><tr><th className="pb-2">Season</th><th className="hidden pb-2 sm:table-cell">Dates</th><th className="pb-2">Adjustment</th><th /></tr></thead>
          <tbody className="divide-y divide-line border-t border-line">
            {SEASONS.map((s) => (
              <tr key={s.name}>
                <td className="py-3 pr-3 font-medium text-heading">{s.name}<span className="block text-xs font-normal text-muted sm:hidden">{s.range}</span></td>
                <td className="hidden py-3 text-text sm:table-cell">{s.range}</td>
                <td className="py-3 tabular-nums font-semibold text-heading">{s.adj}</td>
                <td className="py-3 text-right"><button className="text-xs font-semibold text-link">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="mt-3 text-sm font-semibold text-link">+ Add season</button>
      </Panel>

      <Panel title="Optional extras">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Child seat" value="2.500 kr" />
          <Input label="Meet & greet sign" value="Free" />
          <Input label="Extra stop" value="4.900 kr" />
          <Input label="Wi-Fi hotspot" value="1.900 kr / day" />
          <Input label="Ski / bike rack" value="3.500 kr" />
          <Input label="Pet transport" value="3.000 kr" />
        </div>
      </Panel>

      <div className="flex justify-end pb-6">
        <button className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">Save pricing</button>
      </div>
    </div>
  )
}
