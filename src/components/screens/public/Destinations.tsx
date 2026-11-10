'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'

import { PublicPageShell } from '@/components/site/PublicPageShell'
import { DESTINATIONS, type Currency } from '@/lib/design/data'
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

export default function Destinations(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'USD' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={p.currency as Currency}
      mobileTitle="Destinations"
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
        <h1 className="font-display text-3xl font-extrabold text-heading sm:text-4xl">Destinations</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">
          Popular places passengers book as transfers, private tours or private-driver days. Destination copy and imagery are CMS-managed; the list below uses the shared demo seed.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map((d, i) => (
            <button
              key={d.name}
              onClick={p.onBook}
              className={`group relative overflow-hidden rounded-2xl text-left ${i === 0 ? 'sm:col-span-2 sm:min-h-[320px]' : 'min-h-[220px]'}`}
            >
              <img src={d.img} alt={d.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h2 className="font-display text-xl font-bold text-white">{d.name}</h2>
                <p className="mt-1 text-sm text-white/80">{d.note}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-cyan">
                  Book this route <ArrowRight size={14} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </PublicPageShell>
  )
}
