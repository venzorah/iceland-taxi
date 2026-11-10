'use client'

import React from 'react'
import { ArrowRight, BookOpen } from 'lucide-react'

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

const GUIDES = [
  { title: 'First night in Reykjavík after a late flight', img: IMG.reykjavik, minutes: '6 min', body: 'Hotel meets, luggage, and when a private transfer beats a taxi queue.' },
  { title: 'Blue Lagoon before or after KEF', img: IMG.blueLagoon, minutes: '5 min', body: 'Timing a lagoon stop around arrivals and departures without missing a flight.' },
  { title: 'South Coast in one long day', img: IMG.southCoast, minutes: '8 min', body: 'Waterfalls, black sand and daylight windows by season.' },
  { title: 'Glacier Lagoon as a private-driver day', img: IMG.glacierLagoon, minutes: '7 min', body: 'Distance, stops and why fixed tours vs multi-stop driver days differ.' },
]

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
        <p className="mt-3 max-w-2xl text-base text-muted">Longer CMS guides for itineraries and logistics. Seed titles only, publish full articles from Admin → Pages.</p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {GUIDES.map((g) => (
            <article key={g.title} className="flex gap-4 overflow-hidden rounded-2xl border border-line bg-card p-3 sm:gap-5 sm:p-4">
              <img src={g.img} alt="" className="h-28 w-28 shrink-0 rounded-xl object-cover sm:h-32 sm:w-40" />
              <div className="min-w-0 py-1">
                <p className="text-xs font-semibold text-muted">{g.minutes} read</p>
                <h2 className="mt-1 font-display text-lg font-bold text-heading">{g.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{g.body}</p>
                <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-link hover:underline">
                  Open guide <ArrowRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicPageShell>
  )
}
