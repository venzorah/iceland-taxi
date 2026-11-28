'use client'
import { ResponsivePhoto } from '@/components/site/ResponsivePhoto'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clock, Users } from 'lucide-react'

import { PublishedListingsNotice } from '@/components/booking/PublishedListingsNotice'
import { usePublishedListings } from '@/components/booking/usePublishedListings'
import { listingsForCustomers, passengerChoices } from '@/lib/booking/listings'
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

export default function PrivateTours(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'
  const images = useSiteImages()
  const content = useSiteBlocks()
  const cur = p.currency as Currency
  const router = useRouter()
  const {listings, error: listingsError, retry: retryListings} = usePublishedListings()
  const tours = listingsForCustomers((listings || []).filter((listing) => listing.category === 'tour'))

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
      <PublishedListingsNotice error={listingsError} onRetry={retryListings} />
      <section className="relative overflow-hidden bg-navy text-white">
        <ResponsivePhoto src={images.goldenCircle} alt="Golden Circle private tour landscape" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <h1 className="max-w-3xl font-display text-3xl font-extrabold sm:text-5xl">{content['tours.hero.title']}</h1>
          <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">{content['tours.hero.body']}</p>
          <button onClick={() => tours[0] ? router.push(`/book?listing=${encodeURIComponent(tours[0].id)}&kind=${tours[0].kind}`) : router.push('/book?enquiry=1')} className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-on-primary">
            Book a private tour <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {listings === null && <p className="text-sm text-muted">Loading published prices…</p>}
          {!listingsError && listings !== null && tours.length === 0 && <p className="text-sm text-muted">No published tour price yet. This option is unavailable.</p>}
          {tours.map((tour) => (
            <article key={tour.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card">
              <img src={tour.imageUrl || images.goldenCircle} alt={tour.title} className="aspect-[4/3] w-full object-cover" />
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-display text-lg font-bold text-heading">{tour.title}</h2>
                <p className="mt-2 text-sm text-muted">{tour.blurb}</p>
                <div className="mt-3 flex gap-4 text-sm text-muted">
                  {tour.hoursLabel && <span className="inline-flex items-center gap-1"><Clock size={14} /> {tour.hoursLabel}</span>}
                  {(listings ? passengerChoices(listings, tour) : []).length < 2 && tour.paxLabel && <span className="inline-flex items-center gap-1"><Users size={14} /> {tour.paxLabel}</span>}
                </div>
                <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                  <div>
                    {(listings ? passengerChoices(listings, tour) : []).length > 1 ? (listings ? passengerChoices(listings, tour) : []).map((choice) => <p key={choice.id} className="text-sm font-semibold text-heading">{choice.label} · {formatPrice(choice.fromIsk, cur, tour.iskPerEur)}</p>) : <><p className="text-xs text-muted">Price</p><p className="font-display text-xl font-bold text-heading">{formatPrice(tour.fromIsk, cur, tour.iskPerEur)}</p></>}
                  </div>
                  <button onClick={() => router.push(`/book?listing=${encodeURIComponent(tour.id)}&kind=${tour.kind}`)} className="rounded-full bg-navy px-4 py-2.5 text-sm font-bold text-white dark:bg-primary dark:text-on-primary">Book tour</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicPageShell>
  )
}
