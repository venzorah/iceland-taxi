'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CalendarRange, Clock3, Map } from 'lucide-react'

import { usePublishedListings } from '@/components/booking/usePublishedListings'
import { formatPrice } from '@/lib/design/data'

import { PublicPageShell } from '@/components/site/PublicPageShell'
import { IMG, type Currency } from '@/lib/design/data'
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

const PACKAGES = [
  { icon: Clock3, title: 'Hourly', body: 'City hops, meetings and flexible short windows.' },
  { icon: CalendarRange, title: 'Half-day & full-day', body: 'Sightseeing loops with room to change the order of stops.' },
  { icon: Map, title: 'Multi-day vacation driver', body: 'Ring Road segments and multi-stop itineraries, request a quotation for custom days.' },
]

export default function PrivateDriver(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'
  const router = useRouter()
  const driverListings = (usePublishedListings() || []).filter((listing) => listing.category === 'driver')
  const [whatsappE164, setWhatsappE164] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/company')
      .then((r) => r.json())
      .then((d) => setWhatsappE164(d.company?.whatsappE164 || null))
      .catch(() => {})
  }, [])

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
      <section className="relative overflow-hidden bg-navy text-white">
        <img src={IMG.privateDriver} alt="Private chauffeur beside a vehicle" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <h1 className="max-w-3xl font-display text-3xl font-extrabold sm:text-5xl">Private driver & chauffeur hire in Iceland</h1>
          <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">Hourly to multi-day hire with a dedicated vehicle. Ideal when the itinerary is still taking shape.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => driverListings[0] ? router.push(`/book?listing=${encodeURIComponent(driverListings[0].id)}&kind=service`) : router.push('/book?enquiry=1')} className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-on-primary">
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
          {PACKAGES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-2xl border border-line bg-card p-6">
              <Icon className="text-mint" size={22} />
              <h2 className="mt-4 font-display text-lg font-bold text-heading">{title}</h2>
              <p className="mt-2 text-sm text-muted">{body}</p>
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
                  <p className="font-display text-lg font-bold text-heading">{formatPrice(listing.fromIsk, p.currency)}</p>
                  <button onClick={() => router.push(`/book?listing=${encodeURIComponent(listing.id)}&kind=service`)} className="text-sm font-bold text-link">Book</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-8 text-sm text-muted">A published driver price is fixed. A custom itinerary is an enquiry, not a distance fare.</p>
      </section>
    </PublicPageShell>
  )
}
