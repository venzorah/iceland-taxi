'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

type DriverRow = {
  id: string
  displayName: string
  status: string
  active: boolean
  licenceNotes: string | null
  vehicleId: string | null
  vehicleLabel: string
  email: string
}

type VehicleRow = {
  id: string
  name: string
  category: string
  plate: string
  pax: number
  bags: number
  upgradeIsk: number
  active: boolean
  driver: string
}

const dot = (s: string) => (s === 'Available' ? 'bg-mint' : s === 'On trip' || s === 'In use' ? 'bg-cyan' : s === 'Maintenance' ? 'bg-primary' : 'bg-muted')

const inputClass = 'mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus'

export function Fleet({ view }: { view: 'drivers' | 'vehicles' }) {
  const [drivers, setDrivers] = useState<DriverRow[]>([])
  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [msg, setMsg] = useState('Loading…')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const [driverRes, vehicleRes] = await Promise.all([fetch('/api/drivers'), fetch('/api/admin/vehicles')])
      const driverJson = await driverRes.json()
      const vehicleJson = await vehicleRes.json().catch(() => null)
      const vehicleRows: VehicleRow[] = (vehicleJson?.vehicles || []).map(
        (vehicle: { id: string; name: string; category: string; plate?: string | null; pax: number; bags: number; upgradeIsk: number; active: boolean; drivers?: { displayName: string }[] }) => ({
          id: vehicle.id,
          name: vehicle.name,
          category: vehicle.category,
          plate: vehicle.plate || '',
          pax: vehicle.pax,
          bags: vehicle.bags,
          upgradeIsk: vehicle.upgradeIsk,
          active: vehicle.active,
          driver: vehicle.drivers?.[0]?.displayName || '—',
        }),
      )
      setVehicles(vehicleRows)
      const rows: DriverRow[] = (driverJson.drivers || []).map(
        (driver: { id?: string; displayName?: string; name?: string; status?: string; active?: boolean; licenceNotes?: string | null; vehicleId?: string | null; vehicle?: { name?: string; plate?: string | null } | string | null; user?: { email?: string } | null }) => ({
          id: driver.id || '',
          displayName: driver.displayName || driver.name || 'Driver',
          status: driver.status || 'Available',
          active: driver.active !== false,
          licenceNotes: driver.licenceNotes || null,
          vehicleId: driver.vehicleId || null,
          vehicleLabel:
            typeof driver.vehicle === 'string'
              ? driver.vehicle
              : driver.vehicle
                ? `${driver.vehicle.name || 'Vehicle'}${driver.vehicle.plate ? ` · ${driver.vehicle.plate}` : ''}`
                : '—',
          email: driver.user?.email || '',
        }),
      )
      setDrivers(rows)
      setMsg(driverJson.source === 'database' || vehicleJson?.ok ? 'Live database' : driverJson.note || 'Database required to save')
    } catch {
      setMsg('Could not load the fleet')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const startCreate = () => {
    setEditing(null)
    setDraft(view === 'drivers' ? { displayName: '', email: '', status: 'Available', licenceNotes: '', vehicleId: '' } : { name: '', category: 'Sedan', pax: '3', bags: '3', plate: '', upgradeIsk: '0' })
    setOpen(true)
  }

  const startEdit = (id: string) => {
    if (view === 'drivers') {
      const row = drivers.find((item) => item.id === id)
      if (!row) return
      setDraft({ displayName: row.displayName, status: row.status, licenceNotes: row.licenceNotes || '', vehicleId: row.vehicleId || '', active: row.active ? 'yes' : 'no' })
    } else {
      const row = vehicles.find((item) => item.id === id)
      if (!row) return
      setDraft({ name: row.name, category: row.category, pax: String(row.pax), bags: String(row.bags), plate: row.plate, upgradeIsk: String(row.upgradeIsk), active: row.active ? 'yes' : 'no' })
    }
    setEditing(id)
    setOpen(true)
  }

  const save = async () => {
    setMsg('Saving…')
    const path = view === 'drivers' ? (editing ? `/api/admin/drivers/${editing}` : '/api/admin/drivers') : editing ? `/api/admin/vehicles/${editing}` : '/api/admin/vehicles'
    const body =
      view === 'drivers'
        ? {
            displayName: draft.displayName,
            email: editing ? undefined : draft.email,
            status: draft.status,
            licenceNotes: draft.licenceNotes || null,
            vehicleId: draft.vehicleId || null,
            active: draft.active ? draft.active === 'yes' : undefined,
          }
        : {
            name: draft.name,
            category: draft.category,
            pax: Number(draft.pax),
            bags: Number(draft.bags),
            plate: draft.plate || null,
            upgradeIsk: Number(draft.upgradeIsk || 0),
            active: draft.active ? draft.active === 'yes' : undefined,
          }
    const res = await fetch(path, { method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      setMsg(data?.message || 'Could not save')
      return
    }
    setOpen(false)
    setMsg('Saved')
    await load()
  }

  return (
    <div className="mx-auto max-w-[1400px] p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {view === 'drivers' ? 'Drivers cannot be assigned to overlapping journeys. Availability includes a 30-minute buffer.' : 'Vehicle price adjustments apply on top of each service price.'} · {msg}
        </p>
        <button onClick={startCreate} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-on-primary">
          <Plus size={15} /> {view === 'drivers' ? 'Add driver' : 'Add vehicle'}
        </button>
      </div>

      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
          className="mt-4 grid gap-3 rounded-xl border border-line bg-bg p-4 sm:grid-cols-2"
        >
          {view === 'drivers' ? (
            <>
              <label className="text-xs font-semibold text-muted">Name<input required value={draft.displayName || ''} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} className={inputClass} /></label>
              {!editing && <label className="text-xs font-semibold text-muted">Email<input required type="email" value={draft.email || ''} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={inputClass} /></label>}
              <label className="text-xs font-semibold text-muted">Status<input value={draft.status || ''} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className={inputClass} /></label>
              <label className="text-xs font-semibold text-muted">Licence notes<input value={draft.licenceNotes || ''} onChange={(event) => setDraft({ ...draft, licenceNotes: event.target.value })} className={inputClass} /></label>
              <label className="text-xs font-semibold text-muted">
                Vehicle
                <select value={draft.vehicleId || ''} onChange={(event) => setDraft({ ...draft, vehicleId: event.target.value })} className={inputClass}>
                  <option value="">Unassigned</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{vehicle.name}{vehicle.plate ? ` · ${vehicle.plate}` : ''}</option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="text-xs font-semibold text-muted">Name<input required value={draft.name || ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></label>
              <label className="text-xs font-semibold text-muted">Category<input required value={draft.category || ''} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={inputClass} /></label>
              <label className="text-xs font-semibold text-muted">Seats<input required type="number" min={1} value={draft.pax || ''} onChange={(event) => setDraft({ ...draft, pax: event.target.value })} className={inputClass} /></label>
              <label className="text-xs font-semibold text-muted">Bags<input required type="number" min={0} value={draft.bags || ''} onChange={(event) => setDraft({ ...draft, bags: event.target.value })} className={inputClass} /></label>
              <label className="text-xs font-semibold text-muted">Registration<input value={draft.plate || ''} onChange={(event) => setDraft({ ...draft, plate: event.target.value })} className={inputClass} /></label>
              <label className="text-xs font-semibold text-muted">Price adjustment ISK<input type="number" min={0} value={draft.upgradeIsk || ''} onChange={(event) => setDraft({ ...draft, upgradeIsk: event.target.value })} className={inputClass} /></label>
            </>
          )}
          {editing && (
            <label className="flex items-center gap-2 text-sm text-heading">
              <input type="checkbox" checked={draft.active !== 'no'} onChange={(event) => setDraft({ ...draft, active: event.target.checked ? 'yes' : 'no' })} className="h-4 w-4 accent-[var(--mint)]" /> Active
            </label>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">Save</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-heading">Cancel</button>
          </div>
        </form>
      )}

      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg">
        {view === 'drivers'
          ? drivers.map((driver) => (
              <li key={driver.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-heading">{driver.displayName}</p>
                  <p className="truncate text-xs text-muted">{driver.email || 'No email'} · {driver.vehicleLabel}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-text"><span className={`h-2 w-2 rounded-full ${dot(driver.status)}`} />{driver.status} · {driver.active ? 'Active' : 'Inactive'}</p>
                </div>
                {driver.id ? <button onClick={() => startEdit(driver.id)} className="shrink-0 text-xs font-semibold text-link">Edit</button> : <span className="text-xs text-muted">Preview</span>}
              </li>
            ))
          : vehicles.map((vehicle) => (
              <li key={vehicle.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-heading">{vehicle.name} <span className="font-mono text-xs font-normal text-muted">{vehicle.plate}</span></p>
                  <p className="truncate text-xs text-muted">{vehicle.category} · {vehicle.pax} seats · {vehicle.bags} bags · {vehicle.driver}</p>
                  <p className="mt-1 text-xs text-text">{vehicle.active ? 'Active' : 'Hidden'} · ISK {vehicle.upgradeIsk.toLocaleString('en-US')} adjustment</p>
                </div>
                <button onClick={() => startEdit(vehicle.id)} className="shrink-0 text-xs font-semibold text-link">Edit</button>
              </li>
            ))}
        {(view === 'drivers' ? drivers : vehicles).length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">Nothing saved yet. Add a record to store it in the database.</li>}
      </ul>
    </div>
  )
}
