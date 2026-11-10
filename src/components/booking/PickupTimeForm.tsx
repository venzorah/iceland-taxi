'use client'

import React, { useEffect, useState } from 'react'

export type SavedPickup = {
  ref: string
  date: string
  time: string
  label: string
  confirmation: string
  pickupAt: string
}

type Props = {
  bookingRef: string
  date: string
  time: string
  label: string
  canEdit: boolean
  ready?: boolean
  onSaved?: (saved: SavedPickup) => void
}

export function PickupTimeForm({ bookingRef, date, time, label, canEdit, ready = true, onSaved }: Props) {
  const [pickupDate, setPickupDate] = useState(date)
  const [pickupTime, setPickupTime] = useState(time)
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dateId = `pickup-date-${bookingRef}`
  const timeId = `pickup-time-${bookingRef}`

  useEffect(() => {
    setPickupDate(date)
    setPickupTime(time)
  }, [date, time, bookingRef])

  const save = async () => {
    if (!canEdit || !ready) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingRef)}/pickup`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: pickupDate, time: pickupTime }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok || !data.confirmation) {
        setConfirmation('')
        setError(data?.message || 'Could not save the pickup time.')
        return
      }
      setPickupDate(data.date)
      setPickupTime(data.time)
      setConfirmation(data.confirmation)
      onSaved?.({
        ref: data.ref,
        date: data.date,
        time: data.time,
        label: data.label,
        confirmation: data.confirmation,
        pickupAt: data.pickupAt,
      })
    } catch {
      setConfirmation('')
      setError('Could not save the pickup time.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      <h3 className="text-sm font-semibold text-heading">Pickup</h3>
      <p className="mt-1 text-sm text-muted">
        Current pickup: <span className="font-semibold text-heading">{label}</span>
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block" htmlFor={dateId}>
          <span className="text-xs font-semibold text-muted">Pickup date</span>
          <input
            id={dateId}
            type="date"
            value={pickupDate}
            disabled={!canEdit || saving}
            onChange={(event) => {
              setPickupDate(event.target.value)
              setConfirmation('')
            }}
            className="mt-1 w-full min-h-11 rounded-xl border border-input-line bg-input px-3 py-2.5 text-base text-heading outline-none focus:border-focus disabled:opacity-60 sm:text-sm"
          />
        </label>
        <label className="block" htmlFor={timeId}>
          <span className="text-xs font-semibold text-muted">Pickup time</span>
          <input
            id={timeId}
            type="time"
            value={pickupTime}
            disabled={!canEdit || saving}
            onChange={(event) => {
              setPickupTime(event.target.value)
              setConfirmation('')
            }}
            className="mt-1 w-full min-h-11 rounded-xl border border-input-line bg-input px-3 py-2.5 text-base text-heading outline-none focus:border-focus disabled:opacity-60 sm:text-sm"
          />
        </label>
      </div>
      {canEdit ? (
        <button
          type="button"
          onClick={save}
          disabled={!ready || saving || !pickupDate || !pickupTime}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover disabled:opacity-60 sm:w-auto"
        >
          {saving ? 'Saving…' : 'Save pickup'}
        </button>
      ) : (
        <p className="mt-3 text-sm text-muted">Pickup date and time cannot be changed once the trip is completed or cancelled.</p>
      )}
      {confirmation && (
        <p role="status" className="mt-3 text-sm font-semibold text-success">
          {confirmation}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  )
}
