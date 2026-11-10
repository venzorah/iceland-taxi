'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

import { PublicPageShell } from '@/components/site/PublicPageShell'
import { findEditorial } from '@/lib/content/editorial'
import type { AnnouncementState } from '@/lib/design/announcements'
import type { Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'

type Props = {
  kind: 'blog' | 'guide'
  slug: string
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

export default function Article(props: Props) {
  const [article, setArticle] = useState(() => findEditorial(props.kind, props.slug))

  useEffect(() => {
    let cancelled = false
    fetch(`/api/content/editorial?kind=${props.kind}`)
      .then((res) => res.json())
      .then((data) => {
        const match = (data.posts || []).find((post: { slug: string }) => post.slug === props.slug)
        if (!cancelled && match) setArticle(match)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [props.kind, props.slug])
  const back = props.kind === 'blog' ? '/blog' : '/travel-guides'
  const backLabel = props.kind === 'blog' ? 'Blog' : 'Travel guides'

  return (
    <PublicPageShell
      theme={props.theme === 'dark' ? 'dark' : 'light'}
      language={props.language || 'en'}
      currency={props.currency || 'EUR'}
      mobileTitle={backLabel}
      onThemeChange={props.onThemeChange}
      onLanguageChange={props.onLanguageChange}
      onCurrencyChange={props.onCurrencyChange}
      onHome={props.onHome}
      onBook={props.onBook}
      onSignIn={props.onSignIn}
      onStaff={props.onStaff}
      onStaffMobile={props.onStaffMobile}
      onDriver={props.onDriver}
      onAccount={props.onAccount}
      onHelp={props.onHelp}
      announcements={props.announcements}
    >
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <Link href={back} className="text-sm font-bold text-link hover:underline">{backLabel}</Link>
        {article ? (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-mint-text">{article.tag} · {article.date} · {article.minutes}</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-heading sm:text-4xl">{article.title}</h1>
            {article.img ? <img src={article.img} alt="" className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover" /> : null}
            <div className="mt-6 space-y-4 text-base leading-relaxed text-text">
              {article.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </>
        ) : (
          <h1 className="mt-4 font-display text-3xl font-extrabold text-heading">This article is not published</h1>
        )}
      </article>
    </PublicPageShell>
  )
}
