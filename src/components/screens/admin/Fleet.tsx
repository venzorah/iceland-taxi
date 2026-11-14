'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Car, Plus, UserSquare2 } from 'lucide-react'

type DriverRow = {
  id: string
  displayName: string
  status: string
  active: boolean
  licenceNotes: string | null
  vehicleId: string | null
  vehicleLabel: string
  email: string
  phone: string
  hasAccount: boolean
}

type VehicleRow = {
  id: string
  name: string
  category: string
  plate: string
  pax: number
  bags: number
  useCase: string
  upgradeIsk: number
  active: boolean
  drivers: string[]
}

const STATUSES = ['Available', 'Unavailable', 'On trip', 'Off duty', 'Suspended']
const CATEGORIES = ['Sedan', 'Comfort Sedan', 'Premium Sedan', 'SUV', 'Minivan', 'Minibus']

const inputClass = 'mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus'

function statusTone(status: string, active: boolean) {
  if (!active || status === 'Suspended') return 'bg-error/12 text-error'
  if (status === 'Available') return 'bg-success/12 text-success'
  if (status === 'On trip' || status === 'In use') return 'bg-link/12 text-link'
  return 'bg-primary/15 text-warning'
}

export function Fleet({ view }: { view: 'drivers' | 'vehicles' }) {
  const [drivers, setDrivers] = useState<DriverRow[]>([])
  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [msg, setMsg] = useState('Loading…')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const [driverRes, vehicleRes] = await Promise.all([fetch('/api/drivers'), fetch('/api/admin/vehicles')])
      const driverJson = await driverRes.json()
      const vehicleJson = await vehicleRes.json().catch(() => null)
      if (!driverRes.ok || !driverJson.ok || !vehicleRes.ok || !vehicleJson?.ok) throw new Error('Could not load the fleet.')
      const vehicleRows: VehicleRow[] = (vehicleJson?.vehicles || []).map(
        (vehicle: { id: string; name: string; category: string; plate?: string | null; pax: number; bags: number; useCase?: string | null; upgradeIsk: number; active: boolean; drivers?: { displayName: string }[] }) => ({
          id: vehicle.id,
          name: vehicle.name,
          category: vehicle.category,
          plate: vehicle.plate || '',
          pax: vehicle.pax,
          bags: vehicle.bags,
          useCase: vehicle.useCase || '',
          upgradeIsk: vehicle.upgradeIsk,
          active: vehicle.active,
          drivers: (vehicle.drivers || []).map((driver) => driver.displayName),
        }),
      )
      setVehicles(vehicleRows)
      const rows: DriverRow[] = (driverJson.drivers || []).map(
        (driver: { id?: string; displayName?: string; name?: string; status?: string; active?: boolean; licenceNotes?: string | null; vehicleId?: string | null; hasAccount?: boolean; vehicle?: { name?: string; plate?: string | null } | string | null; user?: { email?: string; phone?: string | null } | null }) => ({
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
                : 'No vehicle',
          email: driver.user?.email || '',
          phone: driver.user?.phone || '',
          hasAccount: Boolean(driver.hasAccount),
        }),
      )
      setDrivers(rows)
      setMsg(driverJson.source === 'database' || vehicleJson?.ok ? 'Saved in the database' : driverJson.note || 'A database is required before these changes can be saved')
    } catch {
      setMsg('Could not load the fleet')
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setOpen(false)
    setEditing(null)
  }, [view])

  const startCreate = () => {
    setEditing(null)
    setDraft(
      view === 'drivers'
        ? { displayName: '', email: '', phone: '',  status: 'Available', licenceNotes: '', vehicleId: '', active: 'yes' }
        : { name: '', category: 'Sedan', pax: '3', bags: '3', plate: '', useCase: '', upgradeIsk: '0', active: 'yes' },
    )
    setOpen(true)
  }

  const startEdit = (id: string) => {
    if (view === 'drivers') {
      const row = drivers.find((item) => item.id === id)
      if (!row) return
      setDraft({
        displayName: row.displayName,
        email: row.email,
        phone: row.phone,

        status: row.active ? row.status : 'Suspended',
        licenceNotes: row.licenceNotes || '',
        vehicleId: row.vehicleId || '',
        active: row.active ? 'yes' : 'no',
      })
    } else {
      const row = vehicles.find((item) => item.id === id)
      if (!row) return
      setDraft({
        name: row.name,
        category: row.category,
        pax: String(row.pax),
        bags: String(row.bags),
        plate: row.plate,
        useCase: row.useCase,
        upgradeIsk: String(row.upgradeIsk),
        active: row.active ? 'yes' : 'no',
      })
    }
    setEditing(id)
    setOpen(true)
  }

  const save = async () => {
    setBusy(true)
    setMsg('Saving…')
    const path = view === 'drivers' ? (editing ? `/api/admin/drivers/${editing}` : '/api/admin/drivers') : editing ? `/api/admin/vehicles/${editing}` : '/api/admin/vehicles'
    const body =
      view === 'drivers'
        ? {
            displayName: draft.displayName,
            email: editing ? undefined : draft.email,
            phone: draft.phone || null,
            status: draft.status,
            licenceNotes: draft.licenceNotes || null,
            vehicleId: draft.vehicleId || null,
            active: draft.active === 'yes',
          }
        : {
            name: draft.name,
            category: draft.category,
            pax: Number(draft.pax),
            bags: Number(draft.bags),
            plate: draft.plate || null,
            useCase: draft.useCase || null,
            upgradeIsk: Number(draft.upgradeIsk || 0),
            active: draft.active === 'yes',
          }
    const res = await fetch(path, { method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok || !data?.ok) {
      setMsg(data?.message || 'Could not save')
      return
    }
    setOpen(false)
    setMsg('Saved')
    await load()
  }

  const patchDriver = async (id: string, active: boolean) => {
    const label = active ? 'activate' : 'suspend'
    if (!window.confirm(active ? 'Activate this driver so they can sign in again?' : 'Suspend this driver? They will not be able to sign in.')) return
    setMsg(active ? 'Activating…' : 'Suspending…')
    const res = await fetch(`/api/admin/drivers/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(active ? { active: true, status: 'Available' } : { active: false, status: 'Suspended' }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      setMsg(data?.message || `Could not ${label} the driver`)
      return
    }
    setMsg(active ? 'Driver activated' : 'Driver suspended')
    await load()
  }

  const remove = async (id: string) => {
    const noun = view === 'drivers' ? 'driver' : 'vehicle'
    const warning = view === 'drivers'
      ? 'Archive this driver? Access is disabled and booking history is retained.'
      : 'Hide this vehicle from new bookings? Existing assignments and history are retained.'
    if (!window.confirm(warning)) return
    setMsg('Archiving…')
    const res = await fetch(view === 'drivers' ? `/api/admin/drivers/${id}` : `/api/admin/vehicles/${id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      setMsg(data?.message || `Could not delete the ${noun}`)
      return
    }
    if (editing === id) setOpen(false)
    setMsg('Archived')
    await load()
  }

  const categories = [...new Set([draft.category, ...CATEGORIES].filter(Boolean))]

  return (
    <div className="mx-auto max-w-[1400px] p-3 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm leading-relaxed text-muted">
            {view === 'drivers'
              ? 'Manage driver contact details, vehicles and access. Add the profile first; the driver registers and verifies the same email to activate sign-in.'
              : 'Each card is one car. The additional cost is added to the published trip price. 0 means the car is included.'}
          </p>
          <p className="mt-1 text-xs text-muted">{msg}</p>
        </div>
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
          className="mt-4 rounded-2xl border border-line bg-card p-4 shadow-sm"
        >
          <h2 className="font-display text-base font-bold text-heading">{editing ? (view === 'drivers' ? 'Edit driver' : 'Edit vehicle') : view === 'drivers' ? 'New driver' : 'New vehicle'}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {view === 'drivers' ? (
              <>
                <label className="text-xs font-semibold text-muted">Name<input required value={draft.displayName || ''} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} className={inputClass} /></label>
                <label className="text-xs font-semibold text-muted">Email<input required readOnly={!!editing} type="email" value={draft.email || ''} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={inputClass} /></label>
                <label className="text-xs font-semibold text-muted">Phone<input value={draft.phone || ''} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className={inputClass} /></label>
                <p className="text-xs text-muted">Passwords and verified email changes are managed through secure account sign-in and recovery.</p>
                <label className="text-xs font-semibold text-muted">
                  Status
                  <select value={draft.status || 'Available'} onChange={(event) => setDraft({ ...draft, status: event.target.value, active: event.target.value === 'Suspended' ? 'no' : draft.active })} className={inputClass}>
                    {STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted">
                  Vehicle
                  <select value={draft.vehicleId || ''} onChange={(event) => setDraft({ ...draft, vehicleId: event.target.value })} className={inputClass}>
                    <option value="">Unassigned</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>{vehicle.name}{vehicle.plate ? ` · ${vehicle.plate}` : ''}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted sm:col-span-2">Licence notes<textarea rows={2} value={draft.licenceNotes || ''} onChange={(event) => setDraft({ ...draft, licenceNotes: event.target.value })} className={inputClass} /></label>
              </>
            ) : (
              <>
                <label className="text-xs font-semibold text-muted">Name<input required value={draft.name || ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></label>
                <label className="text-xs font-semibold text-muted">
                  Category
                  <select required value={draft.category || 'Sedan'} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={inputClass}>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted">Seats<input required type="number" min={1} value={draft.pax || ''} onChange={(event) => setDraft({ ...draft, pax: event.target.value })} className={inputClass} /></label>
                <label className="text-xs font-semibold text-muted">Bags<input required type="number" min={0} value={draft.bags || ''} onChange={(event) => setDraft({ ...draft, bags: event.target.value })} className={inputClass} /></label>
                <label className="text-xs font-semibold text-muted">Registration<input value={draft.plate || ''} onChange={(event) => setDraft({ ...draft, plate: event.target.value })} className={inputClass} /></label>
                <label className="text-xs font-semibold text-muted">Additional cost ISK<input type="number" min={0} value={draft.upgradeIsk || ''} onChange={(event) => setDraft({ ...draft, upgradeIsk: event.target.value })} className={inputClass} /></label>
                <label className="text-xs font-semibold text-muted sm:col-span-2">What this car is used for<input value={draft.useCase || ''} onChange={(event) => setDraft({ ...draft, useCase: event.target.value })} placeholder="Airport and city rides" className={inputClass} /></label>
              </>
            )}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-heading">
            <input type="checkbox" checked={draft.active !== 'no'} onChange={(event) => setDraft({ ...draft, active: event.target.checked ? 'yes' : 'no', status: event.target.checked && draft.status === 'Suspended' ? 'Available' : draft.status })} className="h-4 w-4 accent-[var(--mint)]" />
            {view === 'drivers' ? 'Can sign in' : 'Offered to customers'}
          </label>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-heading">Cancel</button>
          </div>
        </form>
      )}

      {view === 'drivers' ? (
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {drivers.map((driver) => (
            <li key={driver.id || driver.displayName} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-heading"><UserSquare2 size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-display text-base font-bold text-heading">{driver.displayName}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone(driver.status, driver.active)}`}>{driver.active ? driver.status : 'Suspended'}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">{driver.email || 'No email'}{driver.phone ? ` · ${driver.phone}` : ''}</p>
                  <p className="mt-1 text-sm text-text">{driver.vehicleLabel}</p>
                  {driver.licenceNotes ? <p className="mt-1 text-xs leading-relaxed text-muted">{driver.licenceNotes}</p> : null}
                  <p className="mt-1 text-xs text-muted">{driver.hasAccount ? 'Sign-in activated' : 'Awaiting verified sign-in'}</p>
                </div>
              </div>
              {driver.id ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  <button onClick={() => startEdit(driver.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary">Edit</button>
                  <button onClick={() => patchDriver(driver.id, !driver.active)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-heading">{driver.active ? 'Suspend' : 'Activate'}</button>
                  <button onClick={() => remove(driver.id)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-error">Archive</button>
                </div>
              ) : <p className="mt-3 text-xs text-muted">Preview only until the database is connected.</p>}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle) => (
            <li key={vehicle.id} className="flex flex-col rounded-2xl border border-line bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-heading"><Car size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-display text-base font-bold text-heading">{vehicle.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${vehicle.active ? 'bg-success/12 text-success' : 'bg-error/12 text-error'}`}>{vehicle.active ? 'Offered' : 'Hidden'}</span>
                  </div>
                  {vehicle.plate ? <p className="mt-0.5 font-mono text-xs text-muted">{vehicle.plate}</p> : null}
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-bg px-2 py-2"><dt className="text-[11px] text-muted">Seats</dt><dd className="text-sm font-bold text-heading">{vehicle.pax}</dd></div>
                <div className="rounded-lg bg-bg px-2 py-2"><dt className="text-[11px] text-muted">Bags</dt><dd className="text-sm font-bold text-heading">{vehicle.bags}</dd></div>
                <div className="rounded-lg bg-bg px-2 py-2"><dt className="text-[11px] text-muted">Extra</dt><dd className="text-sm font-bold text-heading">{vehicle.upgradeIsk > 0 ? vehicle.upgradeIsk.toLocaleString('en-US') : '0'}</dd></div>
              </dl>
              <p className="mt-3 text-sm text-text">{vehicle.category}{vehicle.useCase ? ` · ${vehicle.useCase}` : ''}</p>
              <p className="mt-1 text-xs text-muted">{vehicle.upgradeIsk > 0 ? `ISK ${vehicle.upgradeIsk.toLocaleString('en-US')} added to the trip price` : 'Included in the trip price'}</p>
              <p className="mt-1 text-xs text-muted">{vehicle.drivers.length ? `Assigned: ${vehicle.drivers.join(', ')}` : 'No driver assigned'}</p>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                <button onClick={() => startEdit(vehicle.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary">Edit</button>
                <button onClick={() => remove(vehicle.id)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-error">Archive</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {loaded && (view === 'drivers' ? drivers : vehicles).length === 0 && <p className="mt-4 rounded-2xl border border-line bg-card px-4 py-10 text-center text-sm text-muted">Nothing saved yet. Add a record to store it in the database.</p>}
    </div>
  )
}
