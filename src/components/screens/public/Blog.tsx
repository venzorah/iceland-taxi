'use client'

import React from 'react'

import { PublicPageShell } from '@/components/site/PublicPageShell'
import { BLOG_POSTS } from '@/lib/content/editorial'
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

export default function Blog(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, ...props }
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
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">Practical travel notes from the CMS. Posts are editorial seed content, not customer testimonials.</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <article key={post.slug} className="overflow-hidden rounded-2xl border border-line bg-card">
              <a href={`/blog/${post.slug}`}>
                <img src={post.img} alt="" className="aspect-[16/9] w-full object-cover" />
                <div className="p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-mint-text">{post.tag} · {post.date}</p>
                  <h2 className="mt-2 font-display text-xl font-bold leading-snug text-heading">{post.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{post.excerpt}</p>
                  <span className="mt-4 inline-block text-sm font-bold text-link">Read article</span>
                </div>
              </a>
            </article>
          ))}
        </div>
      </section>
    </PublicPageShell>
  )
}
