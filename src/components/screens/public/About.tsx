'use client'

import React from 'react'
import { ArrowRight, Car, MapPinned, ShieldCheck } from 'lucide-react'

import { PublicPageShell } from '@/components/site/PublicPageShell'
import { useSiteBlock, useSiteImages } from '@/components/providers/SiteContent'
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

export default function About(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, ...props }
  const images = useSiteImages()
  const text = useSiteBlock
  const th = p.theme as 'light' | 'dark'
  const values = [
    { icon: Car, title: text('about.value1.title'), body: text('about.value1.body') },
    { icon: MapPinned, title: text('about.value2.title'), body: text('about.value2.body') },
    { icon: ShieldCheck, title: text('about.value3.title'), body: text('about.value3.body') },
  ]

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
        <img src={images.reykjavik} alt="Reykjavík harbour and city skyline" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <p className="text-sm font-semibold text-cyan">{text('about.kicker')}</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold sm:text-5xl">{text('about.title')}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            {text('about.lead')}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-2xl font-bold text-heading sm:text-3xl">{text('about.whatTitle')}</h2>
            <p className="mt-4 text-base leading-relaxed text-muted">{text('about.what1')}</p>
            <p className="mt-4 text-base leading-relaxed text-muted">{text('about.what2')}</p>
          </div>
          <img src={images.privateDriver} alt="Private driver waiting beside a vehicle" className="aspect-[4/3] w-full rounded-2xl object-cover" />
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {values.map(({ icon: Icon, title, body }) => (
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
