'use client'

import React from 'react'
import { Luggage, Users } from 'lucide-react'

import { PublicPageShell } from '@/components/site/PublicPageShell'
import { FLEET, IMG, type Currency } from '@/lib/design/data'
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

export default function Fleet(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'USD' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={p.currency as Currency}
      mobileTitle="Our fleet"
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
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-heading sm:text-4xl">Our fleet</h1>
            <p className="mt-3 text-base text-muted">
              Choose the vehicle that fits your group and luggage. Capacities are per vehicle and come from the live fleet catalogue — not hardcoded claims about ownership.
            </p>
          </div>
          <img src={IMG.fleet} alt="Sedan, SUV and minivan parked together" className="aspect-[16/10] w-full rounded-2xl object-cover" />
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Vehicle</th>
                <th className="px-5 py-3 font-semibold"><span className="inline-flex items-center gap-1"><Users size={12} /> Pax</span></th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell"><span className="inline-flex items-center gap-1"><Luggage size={12} /> Bags</span></th>
                <th className="px-5 py-3 font-semibold">Best for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {FLEET.map((v) => (
                <tr key={v.name} className="hover:bg-surface/60">
                  <td className="px-5 py-4 font-semibold text-heading">{v.name}</td>
                  <td className="px-5 py-4 text-muted">{v.pax}</td>
                  <td className="hidden px-5 py-4 text-muted sm:table-cell">{v.bags}</td>
                  <td className="px-5 py-4 text-muted">{v.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={p.onBook} className="mt-8 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-on-primary hover:bg-primary-hover">
          Book with a vehicle class
        </button>
      </section>
    </PublicPageShell>
  )
}
