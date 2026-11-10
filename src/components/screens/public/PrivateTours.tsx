'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clock, Users } from 'lucide-react'

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

export default function PrivateTours(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'
  const cur = p.currency as Currency
  const router = useRouter()
  const listings = usePublishedListings()
  const tours = (listings || []).filter((listing) => listing.category === 'tour')

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={cur}
      mobileTitle="Private tours"
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
        <img src={IMG.goldenCircle} alt="Golden Circle private tour landscape" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <h1 className="max-w-3xl font-display text-3xl font-extrabold sm:text-5xl">Private sightseeing tours across Iceland</h1>
          <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">Your own vehicle and driver, your own schedule. Stop where you want, packages are starting points, not fixed bus itineraries.</p>
          <button onClick={() => tours[0] ? router.push(`/book?listing=${encodeURIComponent(tours[0].id)}&kind=service`) : router.push('/book?enquiry=1')} className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-on-primary">
            Book a private tour <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {listings === null && <p className="text-sm text-muted">Loading published prices…</p>}
          {listings !== null && tours.length === 0 && <p className="text-sm text-muted">No published tour price yet. This option is unavailable.</p>}
          {tours.map((tour) => (
            <article key={tour.id} className="overflow-hidden rounded-2xl border border-line bg-card">
              <img src={tour.imageUrl || IMG.goldenCircle} alt={tour.title} className="aspect-[4/3] w-full object-cover" />
              <div className="p-5">
                <h2 className="font-display text-lg font-bold text-heading">{tour.title}</h2>
                <p className="mt-2 text-sm text-muted">{tour.blurb}</p>
                <div className="mt-3 flex gap-4 text-sm text-muted">
                  {tour.hoursLabel && <span className="inline-flex items-center gap-1"><Clock size={14} /> {tour.hoursLabel}</span>}
                  {tour.paxLabel && <span className="inline-flex items-center gap-1"><Users size={14} /> {tour.paxLabel}</span>}
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted">Price</p>
                    <p className="font-display text-xl font-bold text-heading">{formatPrice(tour.fromIsk, cur)}</p>
                  </div>
                  <button onClick={() => router.push(`/book?listing=${encodeURIComponent(tour.id)}&kind=service`)} className="text-sm font-bold text-link hover:underline">Book</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicPageShell>
  )
}
