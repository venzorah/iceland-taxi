'use client'

import React, { useState } from 'react'

export type EnquiryPayload = {
  name: string
  email: string
  phone: string
  channel: 'EMAIL' | 'WHATSAPP'
  fromLabel: string
  toLabel: string
  tripDate: string
  tripTime: string
  passengers: number
  notes: string
}

type Props = {
  initial?: Partial<EnquiryPayload>
  status?: 'idle' | 'sending' | 'sent'
  error?: string | null
  onSubmit: (payload: EnquiryPayload) => void
}

export function CustomEnquiryForm({ initial, status = 'idle', error, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [channel, setChannel] = useState<'' | 'EMAIL' | 'WHATSAPP'>(initial?.channel || '')
  const [fromLabel, setFromLabel] = useState(initial?.fromLabel || '')
  const [toLabel, setToLabel] = useState(initial?.toLabel || '')
  const [tripDate, setTripDate] = useState(initial?.tripDate || '')
  const [tripTime, setTripTime] = useState(initial?.tripTime || '')
  const [passengers, setPassengers] = useState(initial?.passengers || 2)
  const [notes, setNotes] = useState(initial?.notes || '')
  const [localError, setLocalError] = useState<string | null>(null)

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-heading">Enquiry sent</h2>
        <p className="mt-2 text-sm text-muted">
          The team can see this on the admin desk. They will reply by {channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'}.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (channel !== 'EMAIL' && channel !== 'WHATSAPP') {
          setLocalError('Choose Email or WhatsApp.')
          return
        }
        setLocalError(null)
        onSubmit({ name, email, phone, channel, fromLabel, toLabel, tripDate, tripTime, passengers, notes })
      }}
      className="rounded-2xl border border-line bg-card p-4 sm:p-6"
    >
      <h2 className="font-display text-lg font-bold text-heading">Custom booking enquiry</h2>
      <p className="mt-1 text-sm text-muted">This trip is not a published listing, so there is no price to pay here.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Email">
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone / WhatsApp number">
          <input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+354…" className={inputClass} />
        </Field>
        <fieldset className="block">
          <legend className="text-xs font-medium text-muted">Preferred contact</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {([
              ['EMAIL', 'Email'],
              ['WHATSAPP', 'WhatsApp'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={channel === id}
                onClick={() => setChannel(id)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${channel === id ? 'border-heading bg-surface text-heading' : 'border-line text-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="From">
          <input required value={fromLabel} onChange={(event) => setFromLabel(event.target.value)} className={inputClass} />
        </Field>
        <Field label="To">
          <input required value={toLabel} onChange={(event) => setToLabel(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Date">
          <input required type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Time">
          <input required type="time" value={tripTime} onChange={(event) => setTripTime(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Passengers">
          <select value={passengers} onChange={(event) => setPassengers(Number(event.target.value))} className={inputClass}>
            {Array.from({ length: 16 }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </Field>
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-muted">Notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className={`${inputClass} mt-1`} />
        </label>
      </div>
      {(localError || error) && <p className="mt-3 text-sm font-semibold text-error">{localError || error}</p>}
      <button type="submit" disabled={status === 'sending'} className="mt-4 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-on-primary disabled:opacity-70 sm:w-auto sm:px-8">
        {status === 'sending' ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  )
}

const inputClass = 'mt-1 w-full rounded-xl border border-input-line bg-input px-3 py-2.5 text-sm font-semibold text-heading outline-none focus:border-focus'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}
