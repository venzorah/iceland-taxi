'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Input, Panel, Select } from './Services'

const SEASONS = [
  { name: 'Peak summer', range: '15 Jun – 31 Aug', adj: '+10%' },
  { name: 'Aurora season', range: '1 Oct – 31 Mar', adj: '0%' },
  { name: 'Christmas & New Year', range: '20 Dec – 2 Jan', adj: '+25%' },
]

type Extra = { id: string; key: string; labelEn: string; isk: number; active: boolean; isNew?: boolean }

function addonKey(label: string) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return slug || `addon-${Date.now()}`
}

export function Pricing() {
  const [rate, setRate] = useState(138)
  const [eurRate, setEurRate] = useState(150)
  const [usd, setUsd] = useState(true)
  const [isk, setIsk] = useState(true)
  const [extras, setExtras] = useState<Extra[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pricing')
      const data = await res.json()
      if (!data.ok) {
        setMsg(data.message || 'Could not load pricing')
        return
      }
      if (data.rate?.iskPerUsd) setRate(data.rate.iskPerUsd)
      if (data.rate?.iskPerEur) setEurRate(data.rate.iskPerEur)
      setExtras(data.extras || [])
      setMsg(null)
    } catch (e) {
      console.error(e)
      setMsg('Failed to load pricing')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    setMsg(null)
    const rateRes = await fetch('/api/admin/pricing', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'rate', iskPerUsd: rate, iskPerEur: eurRate }),
    })
    const rateData = await rateRes.json()
    if (!rateRes.ok || !rateData.ok) {
      setMsg(rateData.message || 'Could not save rate')
      return
    }
    const usedKeys = new Set(extras.filter((extra) => !extra.isNew).map((extra) => extra.key))
    for (const extra of extras) {
      const labelEn = extra.labelEn.trim()
      if (!labelEn) {
        setMsg('Each add-on needs a name')
        return
      }
      let key = extra.isNew ? addonKey(labelEn) : extra.key
      if (extra.isNew) {
        let n = 2
        while (usedKeys.has(key)) {
          key = `${addonKey(labelEn)}-${n}`
          n += 1
        }
        usedKeys.add(key)
      }
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key,
          labelEn,
          isk: Math.max(0, Math.round(Number(extra.isk) || 0)),
          active: extra.active,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setMsg(data.message || `Could not save ${extra.key}`)
        return
      }
    }
    setMsg('Pricing saved')
    await load()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:space-y-6 sm:p-6">
      {msg && <p className="text-xs text-muted">{msg}</p>}
      <Panel title="Currencies" hint="Customers see the transaction currency before paying, and are charged in exactly that currency.">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            {([['EUR', 'Euro · default for international visitors', usd, setUsd], ['ISK', 'Icelandic króna · residents', isk, setIsk]] as const).map(([code, label, on, set]) => (
              <label key={code} className="flex items-center justify-between rounded-lg border border-line p-3">
                <span>
                  <span className="block text-sm font-semibold text-heading">{code}</span>
                  <span className="block text-xs text-muted">{label}</span>
                </span>
                <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="h-5 w-5 accent-[var(--mint)]" />
              </label>
            ))}
            <Select label="Default currency" value="EUR" options={['EUR', 'ISK']} />
          </div>
          <div>
            <label className="block">
              <span className="text-xs font-semibold text-muted">Exchange rate · ISK per 1 USD</span>
              <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 font-display text-2xl font-bold text-heading outline-none focus:border-focus" />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-semibold text-muted">Exchange rate · ISK per 1 EUR</span>
              <input type="number" value={eurRate} onChange={(e) => setEurRate(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 font-display text-2xl font-bold text-heading outline-none focus:border-focus" />
            </label>
            <p className="mt-2 text-xs text-muted">Public euros use ISK per 1 EUR. The USD rate stays for older USD snapshots. Seed demo, not a live FX feed.</p>
            <div className="mt-4 rounded-lg bg-surface p-4 text-sm">
              <p className="text-muted">Example: KEF → Reykjavík, ISK 22,900</p>
              <p className="mt-1 font-display text-xl font-bold text-heading">€{Math.round(22900 / (eurRate || 1)).toLocaleString('en-US').replace(/,/g, '.')} EUR</p>
            </div>
            <div className="mt-4 flex gap-2 rounded-lg border border-line p-3 text-xs text-text">
              <AlertTriangle size={16} className="shrink-0 text-warning" />
              Confirm Teya supports charging in both EUR and ISK, and your payout currency, before enabling a currency. Older USD bookings stay in USD.
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

      <Panel title="Add-ons" hint="Edit a name or a cost, or add a new add-on. The cost is in ISK.">
        <div className="space-y-3">
          {extras.length === 0 && <p className="text-sm text-muted">No add-ons yet.</p>}
          {extras.map((extra) => (
            <div key={extra.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-muted">Add-on</span>
                <input
                  value={extra.labelEn}
                  onChange={(e) =>
                    setExtras((list) => list.map((x) => (x.id === extra.id ? { ...x, labelEn: e.target.value } : x)))
                  }
                  className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-muted">Cost ISK</span>
                <input
                  type="number"
                  min={0}
                  value={extra.isk}
                  onChange={(e) =>
                    setExtras((list) =>
                      list.map((x) => (x.id === extra.id ? { ...x, isk: Number(e.target.value) || 0 } : x)),
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus"
                />
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm text-heading">
                <input
                  type="checkbox"
                  checked={extra.active}
                  onChange={(e) =>
                    setExtras((list) => list.map((x) => (x.id === extra.id ? { ...x, active: e.target.checked } : x)))
                  }
                  className="h-4 w-4 accent-[var(--mint)]"
                />
                Active
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setExtras((list) => [
                ...list,
                { id: `new-${Date.now()}`, key: '', labelEn: '', isk: 0, active: true, isNew: true },
              ])
            }
            className="text-sm font-semibold text-link"
          >
            + Add add-on
          </button>
        </div>
      </Panel>

      <div className="flex justify-end pb-6">
        <button onClick={save} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">Save pricing</button>
      </div>
    </div>
  )
}
