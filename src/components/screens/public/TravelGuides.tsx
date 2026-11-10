'use client'

import React from 'react'
import { ArrowRight, BookOpen } from 'lucide-react'

import { PublicPageShell } from '@/components/site/PublicPageShell'
import { TRAVEL_GUIDES } from '@/lib/content/editorial'
import type { Currency } from '@/lib/design/data'
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

export default function TravelGuides(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={p.currency as Currency}
      mobileTitle="Travel guides"
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
        <div className="flex items-center gap-2 text-sm font-semibold text-mint-text">
          <BookOpen size={16} /> Travel guides
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-heading sm:text-4xl">Plan the journey, then book the car</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">Longer CMS guides for itineraries and logistics. These are editorial notes, not customer testimonials.</p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {TRAVEL_GUIDES.map((g) => (
            <article key={g.slug} className="overflow-hidden rounded-2xl border border-line bg-card">
              <a href={`/travel-guides/${g.slug}`} className="flex gap-4 p-3 sm:gap-5 sm:p-4">
                <img src={g.img} alt="" className="h-28 w-28 shrink-0 rounded-xl object-cover sm:h-32 sm:w-40" />
                <div className="min-w-0 py-1">
                  <p className="text-xs font-semibold text-muted">{g.minutes} read</p>
                  <h2 className="mt-1 font-display text-lg font-bold leading-snug text-heading">{g.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{g.excerpt}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-link">
                    Open guide <ArrowRight size={14} />
                  </span>
                </div>
              </a>
            </article>
          ))}
        </div>
      </section>
    </PublicPageShell>
  )
}
