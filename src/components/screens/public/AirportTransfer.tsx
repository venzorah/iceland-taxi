'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clock, Plane, Shield } from 'lucide-react'

import { usePublishedListings } from '@/components/booking/usePublishedListings'
import { PublicPageShell } from '@/components/site/PublicPageShell'
import { IMG, formatPrice, type Currency } from '@/lib/design/data'
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
  const cur = p.currency as Currency
  const router = useRouter()
  const listings = usePublishedListings()
  const routes = (listings || []).filter((listing) => listing.kind === 'route')

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
      <section className="relative overflow-hidden bg-navy text-white">
        <img src={IMG.airport} alt="Private transfer at Keflavík Airport" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-cyan"><Plane size={16} /> Keflavík International Airport (KEF)</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold sm:text-5xl">Private airport transfers with flight tracking</h1>
          <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">Fixed-price private rides between KEF, Reykjavík, Blue Lagoon and southwest hotels. Add your flight number and your driver follows the arrival.</p>
          <button onClick={p.onBook} className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-on-primary hover:bg-primary-hover">
            Book airport transfer <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Clock, t: 'Meet at arrivals', d: 'Name sign and included waiting time shown before you pay.' },
            { icon: Shield, t: 'Private vehicle', d: 'Your party only, choose sedan, SUV, minivan or minibus.' },
            { icon: Plane, t: 'Flight-aware', d: 'Delays update the pickup window when a flight number is provided.' },
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
          {listings !== null && routes.length === 0 && <li className="py-4 text-sm text-muted">No published airport price yet. This option is unavailable.</li>}
          {routes.map((r) => (
            <li key={r.id} className="flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-heading">{r.fromLabel} → {r.toLabel}</p>
                <p className="text-sm text-muted">{[r.hoursLabel, r.km ? `${r.km} km` : null].filter(Boolean).join(' · ') || 'Fixed price'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Price</p>
                <p className="font-display text-lg font-bold text-heading">{formatPrice(r.fromIsk, cur)}</p>
              </div>
              <button onClick={() => router.push(`/book?listing=${encodeURIComponent(r.id)}&kind=route`)} className="hidden rounded-full border border-line px-4 py-2 text-sm font-semibold text-heading sm:inline">Book</button>
            </li>
          ))}
        </ul>
      </section>
    </PublicPageShell>
  )
}
