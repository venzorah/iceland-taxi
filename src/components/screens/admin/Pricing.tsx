'use client'
import { useNoticeToast } from '@/components/feedback/FormFeedback'

import { AdminButton, AdminToggle, AdminEmpty, AdminForm, useAdminConfirm } from '@/components/admin/AdminUI'
import { useAdminList, publicationOptions } from '@/components/admin/AdminList'
import React, { useCallback, useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Panel } from './Services'

type Extra = { id: string; key: string; labelEn: string; isk: number; active: boolean; labelIs?: string | null; sortOrder?: number; isNew?: boolean }

function addonKey(label: string) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return slug || `addon-${Date.now()}`
}

export function Pricing() {
  const confirm = useAdminConfirm()
  const [rate, setRate] = useState(138)
  const [eurRate, setEurRate] = useState(150)
  const [extras, setExtras] = useState<Extra[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  useNoticeToast(msg)

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

  const list = useAdminList(extras, row => `${row.labelEn} ${row.labelIs || ''} ${row.key}`, row => row.active ? 'published' : 'hidden', publicationOptions, 'add-ons')
  const save = async () => {
    setMsg(null)
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(eurRate) || eurRate <= 0 || extras.some(extra => !extra.labelEn.trim() || !Number.isFinite(extra.isk) || extra.isk < 0 || !Number.isInteger(extra.sortOrder ?? 0) || (extra.sortOrder ?? 0) < 0)) { setMsg('Enter valid exchange rates, add-on names, prices and display orders.'); return }
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
    window.dispatchEvent(new Event('itb-catalogue-updated'))
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('itb-catalogue') : null
    channel?.postMessage('changed'); channel?.close()
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
          labelEn, labelIs: extra.labelIs?.trim() || '', sortOrder: extra.sortOrder ?? 0,
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
    await load()
    setMsg('Pricing saved.')
  }

  const removeExtra = async (extra: Extra) => {
    if (extra.isNew) {
      setExtras((list) => list.filter((row) => row.id !== extra.id))
      return
    }
    const ok = await confirm({ title: 'Delete this add-on?', description: `${extra.labelEn} will be removed. Bookings already made keep their saved amounts.`, confirmLabel: 'Delete add-on', danger: true })
    if (!ok) return
    const res = await fetch(`/api/admin/pricing?id=${encodeURIComponent(extra.id)}`, { method: 'DELETE' })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      setMsg(data?.message || 'Could not delete the add-on')
      return
    }
    setExtras((list) => list.filter((row) => row.id !== extra.id))
    setMsg('Add-on deleted.')
  }

  return (
    <AdminForm onSubmit={save} className="mx-auto max-w-5xl space-y-4 p-3 sm:space-y-6 sm:p-6">
      {msg && <p className="text-xs text-muted">{msg}</p>}
      <Panel title="Currencies" hint="Customers see the transaction currency before paying, and are charged in exactly that currency.">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            {[['EUR', 'Default for international visitors'], ['ISK', 'Icelandic króna for residents']].map(([code, label]) => <div key={code} className="rounded-xl border border-line p-3"><p className="text-sm font-semibold text-heading">{code}</p><p className="text-xs text-muted">{label}</p></div>)}
          </div>
          <div>
            <label className="block">
              <span className="text-xs font-semibold text-muted">Exchange rate · ISK per 1 USD</span>
              <input required type="number" min={0.001} step="any" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 font-display text-2xl font-bold text-heading outline-none focus:border-focus" />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-semibold text-muted">Exchange rate · ISK per 1 EUR</span>
              <input required type="number" min={0.001} step="any" value={eurRate} onChange={(e) => setEurRate(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 font-display text-2xl font-bold text-heading outline-none focus:border-focus" />
            </label>
            <p className="mt-2 text-xs text-muted">Public euros use ISK per 1 EUR. The USD rate stays for older USD snapshots. Rates are saved manually; they are not a live FX feed.</p>
            <div className="mt-4 rounded-lg bg-surface p-4 text-sm">
              <p className="text-muted">Example: KEF → Reykjavík, car for 1–4 persons, ISK 24,000</p>
              <p className="mt-1 font-display text-xl font-bold text-heading">€{Math.round(24000 / (eurRate || 1)).toLocaleString('en-US').replace(/,/g, '.')} EUR</p>
            </div>
            <div className="mt-4 flex gap-2 rounded-lg border border-line p-3 text-xs text-text">
              <AlertTriangle size={16} className="shrink-0 text-warning" />
              Confirm Teya supports charging in both EUR and ISK, and your payout currency, for your merchant account. Older USD bookings stay in USD.
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Add-ons" hint="Edit a name or a cost, or add a new add-on. The cost is in ISK.">
        <div className="space-y-3">
          {extras.length === 0 && <AdminEmpty title="No add-ons yet" description="Add optional extras with a name and ISK price, then save pricing to publish your changes." />}
          {list.controls}{list.pagination}
          {list.visible.map((extra) => (
            <div key={extra.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-muted">Add-on</span>
                <input required maxLength={150}
                  value={extra.labelEn}
                  onChange={(e) =>
                    setExtras((list) => list.map((x) => (x.id === extra.id ? { ...x, labelEn: e.target.value } : x)))
                  }
                  className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-muted">Cost ISK</span>
                <input required
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
              <label className="block text-xs font-semibold text-muted">Icelandic label (optional)<input value={extra.labelIs || ''} onChange={e => setExtras(list => list.map(item => item.id === extra.id ? { ...item, labelIs: e.target.value } : item))} className="mt-1 w-full rounded-lg border border-line p-3" /></label><label className="block text-xs font-semibold text-muted">Display order<input required type="number" min={0} max={100000} step={1} value={extra.sortOrder ?? 0} onChange={e => setExtras(list => list.map(item => item.id === extra.id ? { ...item, sortOrder: Number(e.target.value) } : item))} className="mt-1 w-full rounded-lg border border-line p-3" /></label><AdminToggle label="Active" checked={extra.active} onChange={active => setExtras(list => list.map(item => item.id === extra.id ? { ...item, active } : item))} /><AdminButton type="button" onClick={() => removeExtra(extra)} className="text-sm font-semibold text-error">Delete</AdminButton>
            </div>
          ))}
          <AdminButton
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
          </AdminButton>
        </div>
      </Panel>

      <div className="flex justify-end pb-6">
        <AdminButton type="submit" pendingLabel="Saving pricing…" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">Save pricing</AdminButton>
      </div>
    </AdminForm>
  )
}
