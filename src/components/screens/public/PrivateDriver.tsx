'use client'
import { useSiteWhatsAppNumber } from '@/components/providers/SiteContent'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CalendarRange, Clock3, Map } from 'lucide-react'

import { PublishedListingsNotice } from '@/components/booking/PublishedListingsNotice'
import { usePublishedListings } from '@/components/booking/usePublishedListings'
import { formatPrice } from '@/lib/design/data'

import { PublicPageShell } from '@/components/site/PublicPageShell'
import { useSiteBlocks, useSiteImages } from '@/components/providers/SiteContent'
import { type Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'
import type { AnnouncementState } from '@/lib/design/announcements'
import { whatsappHref } from '@/lib/whatsapp'

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

const PACKAGES = [{ icon: Clock3, key: 'hourly' }, { icon: CalendarRange, key: 'day' }, { icon: Map, key: 'multi' }]

export default function PrivateDriver(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'
  const images = useSiteImages()
  const content = useSiteBlocks()
  const router = useRouter()
  const {listings, error: listingsError, retry: retryListings} = usePublishedListings()
  const driverListings = (listings || []).filter((listing) => listing.category === 'driver')
  const whatsappE164 = useSiteWhatsAppNumber()



  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={p.currency as Currency}
      mobileTitle="Private driver"
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
        <img src={images.privateDriver} alt="Private chauffeur beside a vehicle" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <h1 className="max-w-3xl font-display text-3xl font-extrabold sm:text-5xl">{content['driver.hero.title']}</h1>
          <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">{content['driver.hero.body']}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => driverListings[0] ? router.push(`/book?listing=${encodeURIComponent(driverListings[0].id)}&kind=${driverListings[0].kind}`) : router.push('/book?enquiry=1')} className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-on-primary">
              Book a private driver <ArrowRight size={16} />
            </button>
            <button onClick={() => router.push('/book?enquiry=1')} className="rounded-full border border-white/30 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
              Request a custom trip
            </button>
            <a href={whatsappHref({ e164: whatsappE164, text: 'Hello Iceland Taxi Booking' })} className="rounded-full border border-white/30 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
              Company WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {PACKAGES.map(({ icon: Icon, key }) => (
            <article key={key} className="rounded-2xl border border-line bg-card p-6">
              <Icon className="text-mint" size={22} />
              <h2 className="mt-4 font-display text-lg font-bold text-heading">{content[`driver.${key}.title`]}</h2>
              <p className="mt-2 text-sm text-muted">{content[`driver.${key}.body`]}</p>
            </article>
          ))}
        </div>
        {driverListings.length > 0 && (
          <ul className="mt-8 divide-y divide-line rounded-2xl border border-line bg-card">
            {driverListings.map((listing) => (
              <li key={listing.id} className="flex items-center justify-between gap-4 px-4 py-4">
                <div>
                  <p className="font-semibold text-heading">{listing.title}</p>
                  <p className="text-sm text-muted">{listing.hoursLabel || 'Fixed price'}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-heading">{formatPrice(listing.fromIsk, p.currency, listing.iskPerEur)}</p>
                  <button onClick={() => router.push(`/book?listing=${encodeURIComponent(listing.id)}&kind=${listing.kind}`)} className="mt-2 rounded-full bg-navy px-4 py-2.5 text-sm font-bold text-white dark:bg-primary dark:text-on-primary">Book</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-8 text-sm text-muted">Choose a listed service for a fixed price, or request a quote for a custom itinerary.</p>
      </section>
    </PublicPageShell>
  )
}
