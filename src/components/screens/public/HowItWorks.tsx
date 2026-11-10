'use client'

import React from 'react'
import { CalendarCheck, CreditCard, MessageSquare, Search } from 'lucide-react'

import { PublicPageShell } from '@/components/site/PublicPageShell'
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

const STEPS = [
  { icon: Search, title: '1. Choose your trip', body: 'Pick airport transfer, private taxi, tour or driver. Enter pickup, destination, date, time and passengers.' },
  { icon: CalendarCheck, title: '2. Confirm the details', body: 'Select a vehicle class, add flight number if needed, and review waiting-time and cancellation terms before checkout.' },
  { icon: CreditCard, title: '3. Pay in EUR or ISK', body: 'International visitors pay in euro (EUR). Residents can choose ISK or EUR. Payment uses the configured gateway (Teya first).' },
  { icon: MessageSquare, title: '4. Track and message', body: 'Use your booking reference to follow status, message the team, request changes or open WhatsApp with a prefilled note.' },
]

export default function HowItWorks(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={p.currency as Currency}
      mobileTitle="How it works"
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
        <h1 className="font-display text-3xl font-extrabold text-heading sm:text-4xl">How it works</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">A short path from search to arrival — designed for phones first, with the same steps on desktop.</p>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-2xl border border-line bg-card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-on-primary">
                <Icon size={18} />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-heading">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>

        <button onClick={p.onBook} className="mt-10 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-on-primary hover:bg-primary-hover">
          Start a booking
        </button>
      </section>
    </PublicPageShell>
  )
}
