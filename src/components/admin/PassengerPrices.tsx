'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminButton, adminInput, adminRequest } from '@/components/admin/AdminUI'

type RouteRow = { id: string; fromLabel: string; toLabel: string; fromIsk: number; serviceId: string | null; active: boolean; minutes: number | null }

function placeName(label: string) {
  return label.replace(/\s*·\s*car\s*·\s*\d+\s*[–-]\s*\d+\s*persons/gi, '').replace(/\s*·\s*\d+\s*[–-]\s*\d+\s*persons/gi, '').trim()
}

function choiceLabel(label: string) {
  const band = label.match(/(\d+)\s*[–-]\s*(\d+)\s*persons/i)
  return band ? `${band[1]}–${band[2]} persons` : label
}

export function PassengerPrices({ service }: { service: { id: string; titleEn: string; active: boolean } }) {
  const [rows, setRows] = useState<RouteRow[]>([])
  const [label, setLabel] = useState('1–4 persons')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    const data = await adminRequest<{ routes: RouteRow[] }>('/api/admin/routes')
    setRows((data.routes || []).filter((route) => route.serviceId === service.id && route.active))
  }, [service.id])
  useEffect(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load passenger prices.')) }, [load])
  const options = rows.filter((route) => /(\d+)\s*[–-]\s*(\d+)\s*persons/i.test(route.toLabel))
  const saveOption = async () => {
    const name = label.trim()
    const amount = Number(price)
    if (!name || !Number.isInteger(amount) || amount < 1) {
      setError('Enter the passenger option and a price in ISK.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const bandKey = (value: string) => value.replace(/[–—-]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase()
      const existing = options.find((route) => bandKey(choiceLabel(route.toLabel)) === bandKey(name))
      if (existing) {
        await adminRequest(`/api/admin/routes/${existing.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fromIsk: amount }) })
      } else {
        const sample = rows[0]
        await adminRequest('/api/admin/routes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            serviceId: service.id,
            fromLabel: sample?.fromLabel || service.titleEn,
            toLabel: `${placeName(sample?.toLabel || '') || service.titleEn} · ${name}`,
            fromIsk: amount,
            active: service.active,
            returnTrip: false,
            minutes: sample?.minutes ?? null,
          }),
        })
      }
      setPrice('')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the passenger price.')
    } finally {
      setBusy(false)
    }
  }
  const updatePrice = async (route: RouteRow, next: string) => {
    const amount = Number(next)
    if (!Number.isInteger(amount) || amount < 1) return
    await adminRequest(`/api/admin/routes/${route.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fromIsk: amount }) })
    setRows((current) => current.map((item) => item.id === route.id ? { ...item, fromIsk: amount } : item))
  }
  const remove = async (route: RouteRow) => {
    await adminRequest(`/api/admin/routes/${route.id}`, { method: 'DELETE' })
    await load()
  }
  return (
    <div className="space-y-3 rounded-xl border border-line p-3" onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault() }}>
      <p className="text-sm font-semibold">Passenger prices</p>
      <p className="text-xs text-muted">Customers see these as choices for this service. For example, 1–4 persons at one price and 5–8 persons at another. Each price is edited on its own.</p>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <ul className="space-y-2">
        {options.map((route) => (
          <li key={route.id} className="flex flex-wrap items-center gap-2">
            <span className="min-w-28 text-sm font-semibold">{choiceLabel(route.toLabel)}</span>
            <input aria-label={`Price for ${choiceLabel(route.toLabel)}`} type="number" min={1} step={1} defaultValue={route.fromIsk} onBlur={(event) => { void updatePrice(route, event.target.value).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not update the price.')) }} className={`${adminInput} max-w-40`} />
            <AdminButton type="button" onClick={() => remove(route).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not remove the option.'))} className="text-sm font-semibold text-error">Remove</AdminButton>
          </li>
        ))}
        {options.length === 0 && <li className="text-sm text-muted">No passenger prices yet.</li>}
      </ul>
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
        <input aria-label="Passenger option" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="1–4 persons" className={adminInput} />
        <input aria-label="Passenger option price" type="number" min={1} step={1} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="ISK price" className={adminInput} />
        <AdminButton type="button" disabled={busy} onClick={() => void saveOption()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary">{busy ? 'Saving…' : 'Add option'}</AdminButton>
      </div>
    </div>
  )
}
