import React, { useState } from 'react'
import { ArrowUpDown, Calendar, Clock, Luggage, MapPin, Navigation, Users } from 'lucide-react'

import { SERVICE_CATEGORIES } from '@shared/data'
import { t, type Lang } from '@shared/i18n'

export type SearchPayload = {
  category: string
  pickup: string
  destination: string
  date: string
  time: string
  passengers: number
  luggage: number
}

export function BookingSearch({ language, onSearch }: { language: Lang; onSearch?: (p: SearchPayload) => void }) {
  const [form, setForm] = useState<SearchPayload>({
    category: 'airport',
    pickup: 'Keflavík Airport (KEF)',
    destination: 'Reykjavík city centre',
    date: '2025-03-14',
    time: '15:30',
    passengers: 2,
    luggage: 2,
  })
  const set = <K extends keyof SearchPayload>(k: K, v: SearchPayload[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSearch?.(form)
      }}
      className="rounded-2xl border border-line bg-card p-4 shadow-[0_20px_50px_-20px_rgba(6,27,58,0.35)] sm:p-6"
    >
      <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist">
        {SERVICE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={form.category === c.id}
            onClick={() => set('category', c.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
              form.category === c.id ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted hover:bg-surface hover:text-heading'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr_150px_120px_110px_110px]">
        <Field label={t(language, 'pickup')} icon={<MapPin size={16} />}>
          <input value={form.pickup} onChange={(e) => set('pickup', e.target.value)} className="w-full bg-transparent text-sm font-semibold text-heading outline-none" />
        </Field>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, pickup: f.destination, destination: f.pickup }))}
          aria-label="Swap pickup and destination"
          className="hidden h-full w-10 place-items-center self-center rounded-full text-muted transition-colors duration-150 hover:bg-surface hover:text-heading lg:grid"
        >
          <ArrowUpDown size={16} className="rotate-90" />
        </button>
        <Field label={t(language, 'destination')} icon={<Navigation size={16} />}>
          <input value={form.destination} onChange={(e) => set('destination', e.target.value)} className="w-full bg-transparent text-sm font-semibold text-heading outline-none" />
        </Field>
        <div className="grid grid-cols-2 gap-3 lg:contents">
          <Field label={t(language, 'date')} icon={<Calendar size={16} />}>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="w-full bg-transparent text-sm font-semibold text-heading outline-none [color-scheme:light] dark:[color-scheme:dark]" />
          </Field>
          <Field label={t(language, 'time')} icon={<Clock size={16} />}>
            <input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} className="w-full bg-transparent text-sm font-semibold text-heading outline-none [color-scheme:light] dark:[color-scheme:dark]" />
          </Field>
          <Field label={t(language, 'passengers')} icon={<Users size={16} />}>
            <select value={form.passengers} onChange={(e) => set('passengers', Number(e.target.value))} className="w-full bg-transparent text-sm font-semibold text-heading outline-none">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n} className="text-navy">{n}</option>
              ))}
            </select>
          </Field>
          <Field label={t(language, 'luggage')} icon={<Luggage size={16} />}>
            <select value={form.luggage} onChange={(e) => set('luggage', Number(e.target.value))} className="w-full bg-transparent text-sm font-semibold text-heading outline-none">
              {Array.from({ length: 17 }, (_, i) => i).map((n) => (
                <option key={n} value={n} className="text-navy">{n}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="order-2 w-full text-center text-xs text-muted sm:order-none sm:w-auto sm:text-left">Free cancellation terms are shown before payment. No account needed.</p>
        <button type="submit" className="w-full whitespace-nowrap rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover sm:w-auto">
          {t(language, 'search')}
        </button>
      </div>
    </form>
  )
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex min-h-[56px] min-w-0 items-center gap-3 rounded-xl border border-input-line bg-input px-3 py-2 transition-colors duration-150 focus-within:border-focus">
      <span className="text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium text-muted">{label}</span>
        {children}
      </span>
    </label>
  )
}
