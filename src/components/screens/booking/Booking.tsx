'use client'

import React, { useMemo, useState } from 'react'
import { ArrowLeft, Baby, Check, CheckCircle2, Copy, Lock, MessageCircle, Plane, Repeat, Signpost } from 'lucide-react'

import { SiteHeader } from '@/components/site/SiteHeader'
import { FLEET, IMG, ISK_PER_EUR, formatPrice, type Currency } from '@/lib/design/data'
import { OFFICIAL_WHATSAPP_E164, whatsappHref } from '@/lib/whatsapp'
import type { Lang } from '@/lib/design/i18n'
import type { AnnouncementState } from '@/lib/design/announcements'

export const args = {
  state: 'default',
  theme: 'light',
  language: 'en',
  customerCategory: 'international',
  currency: 'EUR',
  passengers: 2,
  pickup: 'Keflavík Airport (KEF)',
  destination: 'Reykjavík city centre',
  date: '2025-03-14',
  time: '15:30',
}

export const argTypes = {
  state: { control: 'select', options: ['default', 'paying', 'confirmed'] },
  theme: { control: 'radio', options: ['light', 'dark'] },
  language: { control: 'radio', options: ['en', 'is'] },
  customerCategory: { control: 'radio', options: ['international', 'resident'] },
  currency: { control: 'radio', options: ['EUR', 'ISK'] },
  passengers: { control: 'number' },
}

type Props = Partial<typeof args> & {
  onBack?: () => void
  onPay?: (payload: BookingPayPayload) => void
  onStartEnquiry?: () => void
  listing?: {
    id: string
    kind: 'route' | 'service'
    title: string
    fromLabel: string
    toLabel: string
    fromIsk: number
  } | null
  quoteReady?: boolean
  chargedLabel?: string | null
  unavailableMessage?: string | null
  onThemeChange?: (t: 'light' | 'dark') => void
  onLanguageChange?: (l: Lang) => void
  onCurrencyChange?: (c: Currency) => void
  onCategoryChange?: (category: string) => void
  announcements?: AnnouncementState
  confirmation?: {
    ref: string
    email: string
    statusLabel: string
    totalLabel: string
  }
}

export type BookingPayPayload = {
  category: string
  currency: Currency
  vehicle: string
  extras: { childSeat: boolean; returnTrip: boolean; meetGreet: boolean }
  flight: string
  totalIsk: number
  guestName: string
  guestEmail: string
  guestPhone: string
  hotel: string
  isQuote?: boolean
}

const VEHICLES = [
  { name: 'Standard Sedan' },
  { name: 'Premium Sedan' },
  { name: 'SUV' },
  { name: 'Minivan' },
]

export default function Booking(props: Props) {
  const p = { ...args, ...props }
  const th = p.theme as 'light' | 'dark'
  const [category, setCategory] = useState(p.customerCategory)
  const [vehicle, setVehicle] = useState('Standard Sedan')
  const [extras, setExtras] = useState({ childSeat: false, returnTrip: false, meetGreet: true })
  const [flight, setFlight] = useState('FI 615')
  const [guestName, setGuestName] = useState('Emma Larsen')
  const [guestEmail, setGuestEmail] = useState('emma.larsen@example.com')
  const [guestPhone, setGuestPhone] = useState('+45 20 12 34 56')
  const [hotel, setHotel] = useState('Hotel Borg, Pósthússtræti 11')

  const currency: Currency = category === 'international' ? 'EUR' : (p.currency === 'ISK' ? 'ISK' : 'EUR')
  const vehicleSpec = FLEET.find((v) => v.name === vehicle)!

  const listingPrice = p.listing?.fromIsk ?? 0
  const lines = useMemo(() => {
    if (!p.listing || listingPrice <= 0) return []
    const label = p.listing.kind === 'route' ? `${p.listing.fromLabel} → ${p.listing.toLabel}` : p.listing.title
    return [{ label, isk: listingPrice }]
  }, [p.listing, listingPrice])
  const total = listingPrice
  const totalLabel = p.chargedLabel || (listingPrice > 0 ? formatPrice(listingPrice, currency) : '')
  const canPay = Boolean(p.listing && listingPrice > 0 && p.quoteReady && !p.unavailableMessage)

  const payPayload = (): BookingPayPayload => ({
    category,
    currency,
    vehicle,
    extras,
    flight,
    totalIsk: total,
    guestName,
    guestEmail,
    guestPhone,
    hotel,
  })
  const submitPay = () => {
    if (!canPay) return
    p.onPay?.(payPayload())
  }

  return (
    <div className={th === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-surface font-sans text-text">
        <SiteHeader theme={th} language={p.language as Lang} currency={currency} onThemeChange={p.onThemeChange} onLanguageChange={p.onLanguageChange} onCurrencyChange={p.onCurrencyChange} onHome={p.onBack} mobileTitle={p.state === 'confirmed' ? 'Booking confirmed' : 'Checkout'} onMobileBack={p.onBack} announcements={p.announcements} />

        {p.state === 'confirmed' ? (
          <Confirmed
            total={p.confirmation?.totalLabel || formatPrice(total, currency)}
            currency={currency}
            pickup={p.pickup}
            destination={p.destination}
            date={p.date}
            time={p.time}
            vehicle={vehicle}
            bookingRef={p.confirmation?.ref}
            email={p.confirmation?.email || guestEmail}
            statusLabel={p.confirmation?.statusLabel || 'Confirmed · awaiting driver assignment'}
            onBack={p.onBack}
          />
        ) : (
          <main className="mx-auto max-w-7xl px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-8 lg:px-8 lg:py-12">
            <button onClick={p.onBack} className="hidden items-center gap-2 text-sm font-semibold text-link hover:underline sm:inline-flex"><ArrowLeft size={16} /> Change search</button>
            <h1 className="px-1 font-display text-2xl font-bold text-heading sm:mt-4 sm:px-0 sm:text-4xl">Complete your airport transfer</h1>

            <div className="mt-5 grid items-start gap-4 sm:mt-8 sm:gap-8 lg:grid-cols-[1fr_380px]">
              <div className="space-y-4 sm:space-y-6">
                {/* Journey */}
                <Section title="Journey">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReadOnly label="Pickup" value={p.pickup} />
                    <ReadOnly label="Destination" value={p.destination} />
                    <ReadOnly label="Date & time" value={`${p.date} · ${p.time}`} />
                    <label className="block">
                      <span className="text-xs font-medium text-muted">Flight number</span>
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-input-line bg-input px-3 py-2.5 focus-within:border-focus">
                        <Plane size={16} className="text-muted" />
                        <input value={flight} onChange={(e) => setFlight(e.target.value)} className="w-full bg-transparent text-sm font-semibold text-heading outline-none" />
                      </div>
                    </label>
                  </div>
                  <p className="mt-4 text-sm text-muted">Estimated 45 min · 49 km · {p.passengers} passengers</p>
                </Section>

                {/* Vehicle */}
                <Section title="Vehicle">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {VEHICLES.map((v) => {
                      const spec = FLEET.find((f) => f.name === v.name)!
                      const tooSmall = spec.pax < p.passengers
                      const active = vehicle === v.name
                      return (
                        <button
                          key={v.name}
                          disabled={tooSmall}
                          onClick={() => setVehicle(v.name)}
                          className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-heading bg-card' : 'border-line bg-card hover:border-input-line'}`}
                        >
                          <span>
                            <span className="block font-semibold text-heading">{v.name}</span>
                            <span className="block text-xs text-muted">{spec.pax} seats · {spec.bags} bags</span>
                          </span>
                          <span className="text-right">
                            <span className="block text-sm font-bold text-heading">Included</span>
                            {active && <Check size={16} className="ml-auto mt-1 text-mint-text" />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </Section>

                {/* Extras */}
                <Section title="Extras">
                  <div className="divide-y divide-line">
                    <Toggle icon={<Signpost size={18} />} label="Meet & greet at arrivals" hint="Driver waits with your name sign" price="Included" checked={extras.meetGreet} onChange={(v) => setExtras((e) => ({ ...e, meetGreet: v }))} />
                    <Toggle icon={<Baby size={18} />} label="Child seat" hint="Request a seat. This does not change the published price." price="Included" checked={extras.childSeat} onChange={(v) => setExtras((e) => ({ ...e, childSeat: v }))} />
                    <Toggle icon={<Repeat size={18} />} label="Add return journey" hint="Tell the team in your notes. A return is a separate published listing." price="Included" checked={extras.returnTrip} onChange={(v) => setExtras((e) => ({ ...e, returnTrip: v }))} />
                  </div>
                </Section>

                {/* Customer */}
                <Section title="Your details">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-medium text-muted">Full name</span>
                      <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="mt-1 w-full rounded-xl border border-input-line bg-input px-3 py-2.5 text-sm font-semibold text-heading outline-none transition-colors duration-150 focus:border-focus" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-muted">Email</span>
                      <input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-input-line bg-input px-3 py-2.5 text-sm font-semibold text-heading outline-none transition-colors duration-150 focus:border-focus" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-muted">Phone (with country code)</span>
                      <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-input-line bg-input px-3 py-2.5 text-sm font-semibold text-heading outline-none transition-colors duration-150 focus:border-focus" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-muted">Pickup details (does not change the price)</span>
                      <input value={hotel} onChange={(e) => setHotel(e.target.value)} className="mt-1 w-full rounded-xl border border-input-line bg-input px-3 py-2.5 text-sm font-semibold text-heading outline-none transition-colors duration-150 focus:border-focus" />
                    </label>
                  </div>
                  <p className="mt-6 text-sm font-semibold text-heading">Where do you live?</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {[
                      ['international', 'Visiting Iceland', 'You pay in euro (EUR)'],
                      ['resident', 'I live in Iceland', 'Pay in ISK or EUR'],
                    ].map(([id, label, hint]) => (
                      <button key={id} onClick={() => { setCategory(id); p.onCategoryChange?.(id) }} className={`rounded-xl border p-4 text-left transition-colors duration-150 ${category === id ? 'border-heading bg-card' : 'border-line bg-card hover:border-input-line'}`}>
                        <span className="block font-semibold text-heading">{label}</span>
                        <span className="block text-xs text-muted">{hint}</span>
                      </button>
                    ))}
                  </div>
                  {category === 'resident' && (
                    <div className="mt-4 inline-flex rounded-full border border-line p-0.5 text-sm font-semibold">
                      {(['ISK', 'EUR'] as Currency[]).map((c) => (
                        <button key={c} onClick={() => p.onCurrencyChange?.(c)} className={`rounded-full px-4 py-1.5 transition-colors duration-150 ${currency === c ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted'}`}>
                          Pay in {c}
                        </button>
                      ))}
                    </div>
                  )}
                </Section>
              </div>

              {/* Summary */}
              <aside className="rounded-2xl border border-line bg-card lg:sticky lg:top-40">
                <img src={IMG.airport} alt="" className="hidden h-32 w-full rounded-t-2xl object-cover lg:block" />
                <div className="p-4 sm:p-6">
                  <p className="text-xs font-medium text-muted">Price breakdown</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {lines.map((l) => (
                      <li key={l.label} className="flex justify-between gap-4">
                        <span className="min-w-0 text-text">{l.label}</span>
                        <span className={`shrink-0 font-medium ${l.isk < 0 ? 'text-success' : 'text-heading'}`}>
                          {l.isk === 0 ? 'Free' : (l.isk < 0 ? '−' : '') + formatPrice(Math.abs(l.isk), currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
                    <span className="text-sm font-semibold text-heading">Total, VAT included</span>
                    <span data-listing-price={listingPrice} className="font-display text-3xl font-extrabold text-heading">{totalLabel}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Fixed price saved by the team. Pickup details do not change it.
                  </p>
                  {p.unavailableMessage && <p className="mt-2 text-sm font-semibold text-error">{p.unavailableMessage}</p>}
                  <p className="mt-2 text-xs text-muted">
                    You will be charged in <strong className="text-heading">{currency}</strong>.{currency === 'EUR' && ` Rate used: 1 EUR = ${ISK_PER_EUR} ISK.`}
                  </p>
                  <p className="mt-1 text-xs text-muted">{vehicleSpec.name}: {vehicleSpec.pax} seats, {vehicleSpec.bags} bags</p>
                  <button onClick={submitPay} disabled={p.state === 'paying' || !canPay} className="mt-6 hidden w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary py-3.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover disabled:opacity-70 lg:flex">
                    <Lock size={15} /> {p.state === 'paying' ? 'Processing payment…' : canPay ? `Pay ${totalLabel}` : 'Unavailable'}
                  </button>
                  <button type="button" onClick={p.onStartEnquiry} className="mt-2 hidden w-full rounded-full border border-line py-3 text-sm font-semibold text-heading hover:bg-surface lg:block">
                    This trip is not listed
                  </button>
                  <p className="mt-3 text-xs text-muted lg:text-center">Free cancellation up to 24 hours before pickup</p>
                </div>
              </aside>
            </div>

            {/* Phone checkout bar: the total and the pay action stay in reach of the thumb */}
            <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 pt-3 dark:bg-bg lg:hidden">
              <div className="mx-auto flex max-w-2xl items-center gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted">Total · {currency}</p>
                  <p data-listing-price={listingPrice} className="font-display text-xl font-extrabold text-heading">{totalLabel || 'Unavailable'}</p>
                </div>
                <button onClick={submitPay} disabled={p.state === 'paying' || !canPay} className="ml-auto flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-primary py-3.5 text-base font-bold text-on-primary transition-transform duration-100 ease-out active:scale-[0.98] disabled:opacity-70 sm:max-w-xs">
                  <Lock size={16} /> {p.state === 'paying' ? 'Processing…' : canPay ? 'Pay now' : 'Unavailable'}
                </button>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  )
}

function Confirmed({
  total,
  currency,
  pickup,
  destination,
  date,
  time,
  vehicle,
  bookingRef,
  email,
  statusLabel,
  onBack,
}: {
  total: string
  currency: string
  pickup: string
  destination: string
  date: string
  time: string
  vehicle: string
  bookingRef?: string
  email: string
  statusLabel: string
  onBack?: () => void
}) {
  const ref = bookingRef || 'ITB-PENDING'
  return (
    <main className="mx-auto max-w-2xl px-3 py-6 sm:px-6 sm:py-16">
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-10">
        <CheckCircle2 size={40} className="text-mint-text" />
        <h1 className="mt-4 font-display text-3xl font-bold text-heading">Your transfer is booked</h1>
        <p className="mt-2 text-muted">A confirmation has been sent to {email}. Driver details follow before pickup.</p>
        <div className="mt-8 flex items-center justify-between rounded-xl bg-surface px-5 py-4">
          <div>
            <p className="text-xs text-muted">Booking reference</p>
            <p className="font-display text-2xl font-extrabold tracking-wide text-heading">{ref}</p>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(ref)}
            className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-card hover:text-heading"
            aria-label="Copy reference"
          >
            <Copy size={18} />
          </button>
        </div>
        <dl className="mt-6 divide-y divide-line text-sm">
          {[
            ['Route', `${pickup} → ${destination}`],
            ['Pickup', `${date} · ${time}`],
            ['Vehicle', vehicle],
            ['Amount', `${total} (${currency})`],
            ['Status', statusLabel],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-medium text-heading">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
          <a href={whatsappHref({ e164: OFFICIAL_WHATSAPP_E164, text: `Hello Iceland Taxi Booking, about booking ${ref}` })} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-mint px-5 py-3.5 text-sm font-bold text-navy sm:py-3">
            <MessageCircle size={16} /> Message us on WhatsApp
          </a>
          <button onClick={onBack} className="whitespace-nowrap rounded-full border border-line px-5 py-3 text-sm font-semibold text-heading transition-colors duration-150 hover:bg-surface">Back to homepage</button>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-4 sm:p-6">
      <h2 className="font-display text-lg font-bold text-heading">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 rounded-xl bg-surface px-3 py-2.5 text-sm font-semibold text-heading">{value}</p>
    </div>
  )
}

function Toggle({ icon, label, hint, price, checked, onChange }: { icon: React.ReactNode; label: string; hint: string; price: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-4 sm:gap-4">
      <span className="hidden text-muted sm:block">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-heading">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <span className="whitespace-nowrap text-sm font-semibold text-heading">{price}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-focus ${checked ? 'bg-mint' : 'bg-input-line'}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-150 ease-out ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </span>
    </label>
  )
}
