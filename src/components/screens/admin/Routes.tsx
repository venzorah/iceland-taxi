'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight, Plus } from 'lucide-react'

type RouteRow = {
  id: string
  from: string
  to: string
  km: number | null
  min: number | null
  isk: number
  ret: boolean
  on: boolean
  override: boolean
}

export function Routes() {
  const [rows, setRows] = useState<RouteRow[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [edit, setEdit] = useState({ from: '', to: '', isk: 0 })
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ from: '', to: '', isk: '' })

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/routes')
      const data = await res.json()
      if (!data.ok) {
        setMsg(data.message || 'Could not load routes')
        setRows([])
        return
      }
      setRows(
        (data.routes as Array<{
          id: string
          fromLabel: string
          toLabel: string
          km?: number | null
          minutes?: number | null
          fromIsk: number
          returnTrip: boolean
          active: boolean
          override: boolean
        }>).map((r) => ({
          id: r.id,
          from: r.fromLabel,
          to: r.toLabel,
          km: r.km ?? null,
          min: r.minutes ?? null,
          isk: r.fromIsk,
          ret: r.returnTrip,
          on: r.active,
          override: r.override,
        })),
      )
      setMsg(null)
    } catch (e) {
      console.error(e)
      setMsg('Failed to load routes')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/routes/${id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      setMsg(data?.message || 'Could not delete the route')
      return
    }
    setMsg('Deleted')
    await load()
  }

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/routes/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      setMsg(data.message || 'Update failed')
      return
    }
    setMsg('Saved')
    setEditing(null)
    await load()
  }

  return (
    <div className="mx-auto max-w-[1400px] p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Locations and fixed prices. Checkout uses the saved ISK price, not kilometres.{msg ? ` · ${msg}` : ''}</p>
        <button onClick={() => setCreating((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-on-primary"><Plus size={15} /> New route</button>
      </div>
      {creating && (
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            const res = await fetch('/api/admin/routes', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ fromLabel: draft.from, toLabel: draft.to, fromIsk: Number(draft.isk), active: true, returnTrip: true }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok || !data?.ok) {
              setMsg(data?.message || 'Could not save the route')
              return
            }
            setCreating(false)
            setDraft({ from: '', to: '', isk: '' })
            setMsg('Saved')
            await load()
          }}
          className="mt-4 grid gap-2 rounded-xl border border-line bg-bg p-4 sm:grid-cols-4"
        >
          <input required value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} placeholder="From" className="rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted focus:border-focus" />
          <input required value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} placeholder="To" className="rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted focus:border-focus" />
          <input required value={draft.isk} onChange={(event) => setDraft({ ...draft, isk: event.target.value })} inputMode="numeric" placeholder="Price in ISK" className="rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted focus:border-focus" />
          <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary">Save route</button>
        </form>
      )}
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-heading">{r.from}</p>
                <p className="text-sm font-semibold text-heading">→ {r.to}</p>
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums text-heading">{r.isk.toLocaleString('en-US').replace(/,/g, '.')} kr</p>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="tabular-nums">{r.km ?? '—'} km · {r.min ?? '—'} min</span>
              {r.override && <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">Manual</span>}
              <button onClick={() => patch(r.id, { active: !r.on })} className={`font-semibold ${r.on ? 'text-success' : 'text-muted'}`}>{r.on ? 'Available' : 'Paused'}</button>
              {r.ret ? <span className="inline-flex items-center gap-1"><ArrowLeftRight size={12} /> Return linked</span> : <span className="font-semibold text-link">Create return</span>}
              <button
                onClick={() => {
                  setEditing(r.id)
                  setEdit({ from: r.from, to: r.to, isk: r.isk })
                }}
                className="ml-auto font-semibold text-link"
              >
                Edit
              </button>
              <button onClick={() => remove(r.id)} className="font-semibold text-error">Delete</button>
            </div>
            {editing === r.id && (
              <div className="mt-3 grid gap-2">
                <input value={edit.from} onChange={(e) => setEdit({ ...edit, from: e.target.value })} className="rounded-lg border border-input-line bg-input px-3 py-2 text-sm" />
                <input value={edit.to} onChange={(e) => setEdit({ ...edit, to: e.target.value })} className="rounded-lg border border-input-line bg-input px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <input type="number" value={edit.isk} onChange={(e) => setEdit({ ...edit, isk: Number(e.target.value) || 0 })} className="flex-1 rounded-lg border border-input-line bg-input px-3 py-2 text-sm" />
                  <button onClick={() => patch(r.id, { fromLabel: edit.from, toLabel: edit.to, fromIsk: edit.isk, override: true })} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary">Save</button>
                </div>
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">No routes yet · seed the database.</li>}
      </ul>
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-line bg-bg md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line text-xs font-semibold text-muted">
            <tr>{['From', 'To', 'Distance', 'Duration', 'Price', 'Return route', 'Status', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-heading">{editing === r.id ? <input value={edit.from} onChange={(e) => setEdit({ ...edit, from: e.target.value })} className="w-full rounded border border-input-line bg-input px-2 py-1" /> : r.from}</td>
                <td className="px-4 py-3 font-medium text-heading">{editing === r.id ? <input value={edit.to} onChange={(e) => setEdit({ ...edit, to: e.target.value })} className="w-full rounded border border-input-line bg-input px-2 py-1" /> : r.to}</td>
                <td className="px-4 py-3 tabular-nums text-text">{r.km ?? '—'} km</td>
                <td className="px-4 py-3 tabular-nums text-text">
                  {r.min ?? '—'} min{r.override && <span className="ml-1.5 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">Manual</span>}
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold text-heading">
                  {editing === r.id ? (
                    <input type="number" value={edit.isk} onChange={(e) => setEdit({ ...edit, isk: Number(e.target.value) || 0 })} className="w-28 rounded border border-input-line bg-input px-2 py-1" />
                  ) : (
                    `${r.isk.toLocaleString('en-US').replace(/,/g, '.')} kr`
                  )}
                </td>
                <td className="px-4 py-3">{r.ret ? <span className="inline-flex items-center gap-1 text-text"><ArrowLeftRight size={13} /> Linked</span> : <button className="text-xs font-semibold text-link">Create return</button>}</td>
                <td className="px-4 py-3">
                  <button onClick={() => patch(r.id, { active: !r.on })} className={`text-xs font-semibold ${r.on ? 'text-success' : 'text-muted'}`}>{r.on ? 'Available' : 'Paused'}</button>
                </td>
                <td className="px-4 py-3 text-right">
                  {editing === r.id ? (
                    <button onClick={() => patch(r.id, { fromLabel: edit.from, toLabel: edit.to, fromIsk: edit.isk, override: true })} className="text-xs font-semibold text-link">Save</button>
                  ) : (
                    <span className="inline-flex gap-3">
                      <button
                        onClick={() => {
                          setEditing(r.id)
                          setEdit({ from: r.from, to: r.to, isk: r.isk })
                        }}
                        className="text-xs font-semibold text-link"
                      >
                        Edit
                      </button>
                      <button onClick={() => remove(r.id)} className="text-xs font-semibold text-error">Delete</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Map autocomplete, distance and duration calculation connect to Google Maps once an API key is added in System settings.</p>
    </div>
  )
}
