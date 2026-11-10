'use client'

import React from 'react'
import { ArrowRight, Briefcase, Car, Clock, Plane, Route } from 'lucide-react'

import { PublicPageShell } from '@/components/site/PublicPageShell'
import { IMG, type Currency } from '@/lib/design/data'
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
  onAirport?: () => void
  onTours?: () => void
  onPrivateDriver?: () => void
  announcements?: AnnouncementState
}

const SERVICES = [
  { id: 'airport', icon: Plane, title: 'Airport transfers', img: IMG.airport, body: 'Private meets at KEF with flight tracking, fixed routes to Reykjavík, Blue Lagoon and southwest hotels.', cta: 'Airport landing', go: 'onAirport' as const },
  { id: 'taxi', icon: Car, title: 'Private taxi', img: IMG.reykjavik, body: 'Point-to-point city and regional rides with vehicle classes sized for passengers and luggage.', cta: 'Book a taxi', go: 'onBook' as const },
  { id: 'tours', icon: Route, title: 'Private tours', img: IMG.goldenCircle, body: 'Golden Circle, South Coast, Northern Lights and custom day tours — your pace, your stops.', cta: 'Tours landing', go: 'onTours' as const },
  { id: 'driver', icon: Clock, title: 'Private driver', img: IMG.privateDriver, body: 'Hourly, half-day, full-day and multi-day chauffeur hire for itineraries that change on the road.', cta: 'Driver landing', go: 'onPrivateDriver' as const },
  { id: 'corporate', icon: Briefcase, title: 'Corporate travel', img: IMG.fleet, body: 'Staff transfers, visitor meets and invoiced company bookings. Request a quotation for recurring routes.', cta: 'Request quote', go: 'onBook' as const },
]

export default function Services(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'USD' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'
  const handlers = {
    onAirport: p.onAirport,
    onTours: p.onTours,
    onPrivateDriver: p.onPrivateDriver,
    onBook: p.onBook,
  }

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={p.currency as Currency}
      mobileTitle="Services"
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
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <h1 className="font-display text-3xl font-extrabold text-heading sm:text-4xl">Services</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">Every service is configured in Admin with live prices, durations and vehicle rules. Choose a category to book or open its SEO landing page.</p>

        <div className="mt-10 grid gap-4 sm:gap-6">
          {SERVICES.map((s) => {
            const Icon = s.icon
            return (
              <article key={s.id} className="grid overflow-hidden rounded-2xl border border-line bg-card sm:grid-cols-[280px_1fr]">
                <img src={s.img} alt="" className="h-44 w-full object-cover sm:h-full" />
                <div className="flex flex-col justify-center p-5 sm:p-8">
                  <p className="flex items-center gap-2 text-sm font-semibold text-mint-text">
                    <Icon size={16} /> {s.title}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-muted">{s.body}</p>
                  <button
                    onClick={() => handlers[s.go]?.()}
                    className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-bold text-link hover:underline"
                  >
                    {s.cta} <ArrowRight size={16} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </PublicPageShell>
  )
}
