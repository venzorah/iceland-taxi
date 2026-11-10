'use client'

import React from 'react'

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

const POSTS = [
  { title: 'What to pack for a KEF arrival in March', date: '2 Mar 2025', tag: 'Airport', img: IMG.airport, excerpt: 'Layers, studded-tyre season and why flight numbers help your driver.' },
  { title: 'Planning a Golden Circle day without rushing', date: '18 Feb 2025', tag: 'Tours', img: IMG.goldenCircle, excerpt: 'How private tours leave room for longer stops at Geysir and Gullfoss.' },
  { title: 'USD vs ISK at checkout — who chooses what', date: '5 Feb 2025', tag: 'Booking', img: IMG.reykjavik, excerpt: 'International visitors, residents and why currency is shown before payment.' },
  { title: 'Reading the aurora forecast before you book', date: '22 Jan 2025', tag: 'Northern Lights', img: IMG.northernLights, excerpt: 'Cloud cover, solar activity and flexible evening windows with a private driver.' },
]

export default function Blog(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'USD' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={p.currency as Currency}
      mobileTitle="Blog"
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
        <h1 className="font-display text-3xl font-extrabold text-heading sm:text-4xl">Blog</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">Practical travel notes from the CMS. Posts are editorial seed content — not customer testimonials.</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {POSTS.map((post) => (
            <article key={post.title} className="overflow-hidden rounded-2xl border border-line bg-card">
              <img src={post.img} alt="" className="aspect-[16/9] w-full object-cover" />
              <div className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-mint-text">{post.tag} · {post.date}</p>
                <h2 className="mt-2 font-display text-xl font-bold text-heading">{post.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{post.excerpt}</p>
                <button type="button" className="mt-4 text-sm font-bold text-link hover:underline">Read article</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicPageShell>
  )
}
