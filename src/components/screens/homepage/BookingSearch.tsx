'use client'

import React, { useState } from 'react'
import { ArrowUpDown, Calendar, Clock, Luggage, MapPin, Navigation, Users } from 'lucide-react'

import { usePublishedListings } from '@/components/booking/usePublishedListings'
import { catalogueOptions } from '@/lib/booking/catalogue-search'
import { SERVICE_CATEGORIES } from '@/lib/design/data'
import { t, type Lang } from '@/lib/design/i18n'

export type SearchPayload = {
  category: string
  pickup: string
  destination: string
  date: string
  time: string
  passengers: number
  luggage: number
  listingId?: string
  listingKind?: 'route' | 'service'
  enquiry?: boolean
}

export function BookingSearch({ language, onSearch, initial }: { language: Lang; onSearch?: (p: SearchPayload) => void; initial?: Partial<SearchPayload> }) {
  const [form, setForm] = useState<SearchPayload>({
    category: 'airport',
    pickup: '',
    destination: '',
    date: '',
    time: '',
    passengers: 1,
    luggage: 0,
    ...initial,
  })
  const { listings, error, retry } = usePublishedListings()
  const categories = [...SERVICE_CATEGORIES, ...((listings || []).some(item => item.category === 'custom') ? [{ id: 'custom', label: 'Other routes' }] : [])]
  const options = catalogueOptions(listings || [], form.category, form.pickup)
  const selectClass = 'w-full min-w-0 bg-transparent text-sm font-semibold text-heading outline-none'
  const set = <K extends keyof SearchPayload>(k: K, v: SearchPayload[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSearch?.(form)
      }}
      className="w-full min-w-0 overflow-x-clip rounded-2xl border border-line bg-card p-4 shadow-[0_20px_50px_-20px_rgba(6,27,58,0.35)] sm:p-6"
    >
      <div className="flex flex-wrap gap-1" role="tablist">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={form.category === c.id}
            onClick={() => setForm(f => ({ ...f, category: c.id, pickup: '', destination: '' }))}
            className={`rounded-full px-4 py-2 text-sm font-semibold leading-snug transition-colors duration-150 ${
              form.category === c.id ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted hover:bg-surface hover:text-heading'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_150px_120px_110px_110px]">
        <Field label={t(language, 'pickup')} icon={<MapPin size={16} />}>
          <select disabled={!options.pickups.length} value={form.pickup} onChange={e => setForm(f => ({ ...f, pickup: e.target.value, destination: '' }))} className={selectClass}><option value="">{options.pickups.length ? 'Any published pickup' : 'Choose an offer opposite'}</option>{options.pickups.map(place => <option key={place} value={place}>{place}</option>)}</select>
        </Field>
        <button
          type="button"
          disabled={!(listings || []).some(item => item.category === form.category && item.kind === 'route' && item.fromLabel === form.destination && item.toLabel === form.pickup)}
          onClick={() => setForm((f) => ({ ...f, pickup: f.destination, destination: f.pickup }))}
          aria-label="Swap pickup and destination"
          className="hidden h-full w-10 place-items-center self-center rounded-full text-muted transition-colors duration-150 hover:bg-surface hover:text-heading lg:grid"
        >
          <ArrowUpDown size={16} className="rotate-90" />
        </button>
        <Field label={t(language, 'destination')} icon={<Navigation size={16} />}>
          <select value={form.destination} onChange={e => set('destination', e.target.value)} className={selectClass}><option value="">All published destinations / offers</option>{options.destinations.map(place => <option key={place} value={place}>{place}</option>)}{!form.pickup && options.services.map(item => <option key={item.id} value={item.title}>{item.title}</option>)}</select>
        </Field>
        <div className="grid min-w-0 grid-cols-2 gap-3 lg:contents">
          <Field label={t(language, 'date')} icon={<Calendar size={16} />}>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="w-full min-w-0 max-w-full bg-transparent text-sm font-semibold text-heading outline-none [color-scheme:light] dark:[color-scheme:dark]" />
          </Field>
          <Field label={t(language, 'time')} icon={<Clock size={16} />}>
            <input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} className="w-full min-w-0 max-w-full bg-transparent text-sm font-semibold text-heading outline-none [color-scheme:light] dark:[color-scheme:dark]" />
          </Field>
          <Field label={t(language, 'passengers')} icon={<Users size={16} />}>
            <select value={form.passengers} onChange={(e) => set('passengers', Number(e.target.value))} className="w-full min-w-0 max-w-full bg-transparent text-sm font-semibold text-heading outline-none">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n} className="text-navy">{n}</option>
              ))}
            </select>
          </Field>
          <Field label={t(language, 'luggage')} icon={<Luggage size={16} />}>
            <select value={form.luggage} onChange={(e) => set('luggage', Number(e.target.value))} className="w-full min-w-0 max-w-full bg-transparent text-sm font-semibold text-heading outline-none">
              {Array.from({ length: 17 }, (_, i) => i).map((n) => (
                <option key={n} value={n} className="text-navy">{n}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-error">{error} <button type="button" onClick={retry} className="underline">Retry</button></p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="order-2 w-full text-center text-xs text-muted sm:order-none sm:w-auto sm:text-left">Browse published options. Pickup and vehicle availability are confirmed during booking.</p>
        <button type="submit" disabled={listings === null || !!error} className="w-full whitespace-nowrap rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover sm:w-auto">
          {t(language, 'search')}
        </button>
      </div>
    </form>
  )
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex min-h-12 min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-input-line bg-input px-3 py-2 transition-colors duration-150 focus-within:border-focus">
      <span className="text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium text-muted">{label}</span>
        {children}
      </span>
    </label>
  )
}
