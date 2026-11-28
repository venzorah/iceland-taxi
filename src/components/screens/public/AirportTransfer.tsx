'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clock, Plane, Shield } from 'lucide-react'

import { PublishedListingsNotice } from '@/components/booking/PublishedListingsNotice'
import { usePublishedListings } from '@/components/booking/usePublishedListings'
import { customerPlaceLabel, listingsForCustomers, passengerChoices } from '@/lib/booking/listings'
import { PublicPageShell } from '@/components/site/PublicPageShell'
import { useSiteBlocks, useSiteImages } from '@/components/providers/SiteContent'
import { formatPrice, type Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'
import type { AnnouncementState } from '@/lib/design/announcements'

type Props = {
  theme?: 'light' | 'dark'
  language?: Lang
  currency?: Currency
  onThemeChange?: (t: 'light' | 'dark') => void
  onLanguageChange?: (l: Lang) => void
  onCurrencyChange?: (c: Currency) => void
  onHome?: () => void
  onBook?: () => void
  onSignIn?: () => void
  onStaff?: () => void
  onStaffMobile?: () => void
  onDriver?: () => void
  onAccount?: () => void
  onHelp?: () => void
  announcements?: AnnouncementState
}

export default function AirportTransfer(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'
  const images = useSiteImages()
  const content = useSiteBlocks()
  const cur = p.currency as Currency
  const router = useRouter()
  const {listings, error: listingsError, retry: retryListings} = usePublishedListings()
  const routes = listingsForCustomers((listings || []).filter((listing) => listing.category === 'airport'))

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={cur}
      mobileTitle="Airport transfer"
      onThemeChange={p.onThemeChange}
      onLanguageChange={p.onLanguageChange}
      onCurrencyChange={p.onCurrencyChange}
      onHome={p.onHome}
      onBook={p.onBook}
      onSignIn={p.onSignIn}
      onStaff={p.onStaff}
      onStaffMobile={p.onStaffMobile}
      onDriver={p.onDriver}
      onAccount={p.onAccount}
      onHelp={p.onHelp}
      announcements={p.announcements}
    >
      <PublishedListingsNotice error={listingsError} onRetry={retryListings} />
      <section className="relative overflow-hidden bg-navy text-white">
        <img src={images.airport} alt="Private transfer at Keflavík Airport" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-cyan"><Plane size={16} /> Keflavík International Airport (KEF)</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold sm:text-5xl">{content['airport.hero.title']}</h1>
          <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">{content['airport.hero.body']}</p>
          <button onClick={p.onBook} className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-on-primary hover:bg-primary-hover">
            Book airport transfer <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Clock, t: content['airport.meet.title'], d: content['airport.meet.body'] },
            { icon: Shield, t: content['airport.vehicle.title'], d: content['airport.vehicle.body'] },
            { icon: Plane, t: content['airport.flight.title'], d: content['airport.flight.body'] },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-line bg-card p-5">
              <Icon className="text-cyan" size={20} />
              <h2 className="mt-3 font-display text-lg font-bold text-heading">{t}</h2>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl font-bold text-heading">Popular routes</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {listings === null && <li className="py-4 text-sm text-muted">Loading published prices…</li>}
          {!listingsError && listings !== null && routes.length === 0 && <li className="py-4 text-sm text-muted">No published airport price yet. This option is unavailable.</li>}
          {routes.map((r) => (
            <li key={r.id} className="flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-heading">{r.fromLabel} → {customerPlaceLabel(r)}</p>
                <p className="text-sm text-muted">{[r.hoursLabel, r.km ? `${r.km} km` : null].filter(Boolean).join(' · ') || 'Fixed price'}</p>
              </div>
              <div className="text-right">
                {(listings ? passengerChoices(listings, r) : []).length > 1 ? (listings ? passengerChoices(listings, r) : []).map((choice) => <p key={choice.id} className="text-sm font-semibold text-heading">{choice.label} · {formatPrice(choice.fromIsk, cur, r.iskPerEur)}</p>) : <><p className="text-xs text-muted">Price</p><p className="font-display text-lg font-bold text-heading">{formatPrice(r.fromIsk, cur, r.iskPerEur)}</p></>}
              </div>
              <button onClick={() => router.push(`/book?listing=${encodeURIComponent(r.id)}&kind=route`)} className="rounded-full bg-navy px-4 py-2.5 text-sm font-bold text-white dark:bg-primary dark:text-on-primary">Book</button>
            </li>
          ))}
        </ul>
      </section>
    </PublicPageShell>
  )
}
