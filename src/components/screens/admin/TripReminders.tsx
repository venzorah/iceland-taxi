'use client'

import React, { useEffect, useState } from 'react'

type Unit = 'hours' | 'days' | 'weeks'
type Row = { key: string; amount: string; unit: Unit; active: boolean }

const START: Row[] = [
  { key: 'week', amount: '1', unit: 'weeks', active: true },
  { key: 'days', amount: '3', unit: 'days', active: true },
  { key: 'hours', amount: '5', unit: 'hours', active: true },
]

function newKey() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function TripReminders() {
  const [rows, setRows] = useState<Row[]>(START)
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/reminders')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled || !body?.ok || !Array.isArray(body.reminders)) return
        setRows(body.reminders.map((row: { id: string; amount: number; unit: Unit; active: boolean }) => ({
          key: row.id,
          amount: String(row.amount),
          unit: row.unit,
          active: row.active,
        })))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    setSaving(true)
    setStatus(null)
    const reminders = rows.map((row) => ({
      amount: Number(row.amount),
      unit: row.unit,
      active: row.active,
    }))
    const res = await fetch('/api/admin/reminders', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reminders }),
    })
    const body = await res.json().catch(() => null)
    setSaving(false)
    if (!res.ok || !body?.ok) {
      setStatus(body?.message || 'Could not save reminder times')
      return
    }
    setRows(body.reminders.map((row: { id: string; amount: number; unit: Unit; active: boolean }) => ({
      key: row.id,
      amount: String(row.amount),
      unit: row.unit,
      active: row.active,
    })))
    setStatus(body.reminders.length ? 'Reminder times saved. The next email run uses these.' : 'All reminder emails are off.')
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-base font-bold text-heading">Trip reminder emails</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">These times are before pickup. Each active reminder is emailed to the customer, the assigned driver, and admin.</p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.key} className="flex flex-col gap-2 rounded-xl border border-line bg-bg px-3 py-3 sm:flex-row sm:items-center">
            <label className="text-xs font-semibold text-muted">
              Send
              <input
                value={row.amount}
                inputMode="numeric"
                aria-label="Reminder amount"
                onChange={(event) => setRows((current) => current.map((item) => item.key === row.key ? { ...item, amount: event.target.value.replace(/[^\d]/g, '') } : item))}
                className="mt-1 w-24 rounded-lg border border-input-line bg-input px-3 py-2 text-sm font-semibold text-heading outline-none focus:border-focus"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Unit
              <select
                value={row.unit}
                aria-label="Reminder unit"
                onChange={(event) => setRows((current) => current.map((item) => item.key === row.key ? { ...item, unit: event.target.value as Unit } : item))}
                className="mt-1 block rounded-lg border border-input-line bg-input px-3 py-2 text-sm font-semibold text-heading outline-none focus:border-focus"
              >
                <option value="hours">hours before</option>
                <option value="days">days before</option>
                <option value="weeks">weeks before</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-heading sm:ml-2 sm:mt-5">
              <input
                type="checkbox"
                checked={row.active}
                onChange={(event) => setRows((current) => current.map((item) => item.key === row.key ? { ...item, active: event.target.checked } : item))}
              />
              Active
            </label>
            <button
              type="button"
              onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
              className="text-sm font-semibold text-error sm:ml-auto sm:mt-5"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRows((current) => [...current, { key: newKey(), amount: '1', unit: 'days', active: true }])}
          className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-heading"
        >
          Add reminder
        </button>
        <button type="button" disabled={saving} onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60">
          {saving ? 'Saving…' : 'Save reminder times'}
        </button>
      </div>
      {status && <p className="mt-2 text-xs text-muted">{status}</p>}
    </section>
  )
}
