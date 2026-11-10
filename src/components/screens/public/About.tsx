'use client'

import React from 'react'
import { ArrowRight, Car, MapPinned, ShieldCheck } from 'lucide-react'

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
  announcements?: AnnouncementState
}

const VALUES = [
  { icon: Car, title: 'Private vehicles only', body: 'Every trip is a private booking — no shared shuttles, no open marketplace. You choose the vehicle class that fits your luggage and group.' },
  { icon: MapPinned, title: 'Built around Iceland travel', body: 'Airport meets, sightseeing days and multi-day private drivers are priced and scheduled as distinct services, with waiting-time rules shown before you pay.' },
  { icon: ShieldCheck, title: 'You stay in control', body: 'Book as a guest or with an account. Track status, message the team, request changes and keep receipts from one booking reference.' },
]

export default function About(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={p.currency as Currency}
      mobileTitle="About us"
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
        <img src={IMG.reykjavik} alt="Reykjavík harbour and city skyline" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <p className="text-sm font-semibold text-cyan">Iceland Taxi Booking</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold sm:text-5xl">Company-owned transport, booked around your trip</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            We design airport transfers, private taxis, sightseeing tours and vacation drivers as one booking experience — clear prices, flight-aware pickups and in-app messaging when plans change.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-2xl font-bold text-heading sm:text-3xl">What we are</h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Iceland Taxi Booking is a company booking platform — not an open taxi marketplace. Services, vehicles, routes and prices are managed by the operations team and published to the site when ready.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Company contact details, registrations and fleet facts live in the CMS so they stay accurate. This page describes how the product works; published company facts appear when administrators add them.
            </p>
          </div>
          <img src={IMG.privateDriver} alt="Private driver waiting beside a vehicle" className="aspect-[4/3] w-full rounded-2xl object-cover" />
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-2xl border border-line bg-card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-surface text-navy dark:text-cyan">
                <Icon size={18} />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-heading">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <button onClick={p.onBook} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-on-primary hover:bg-primary-hover">
            Book a ride <ArrowRight size={16} />
          </button>
          <button onClick={p.onHome} className="rounded-full border border-line px-6 py-3.5 text-sm font-semibold text-heading hover:bg-surface">
            Back to homepage
          </button>
        </div>
      </section>
    </PublicPageShell>
  )
}
