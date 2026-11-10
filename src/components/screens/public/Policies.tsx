'use client'

import React, { useEffect, useState } from 'react'

import { PublicPageShell } from '@/components/site/PublicPageShell'
import type { Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'
import type { AnnouncementState } from '@/lib/design/announcements'

const TABS = [
  { id: 'privacy', label: 'Privacy policy' },
  { id: 'terms', label: 'Terms & conditions' },
  { id: 'cancellation', label: 'Cancellation' },
  { id: 'refund', label: 'Refunds' },
] as const

export type PolicyId = (typeof TABS)[number]['id']

const COPY: Record<PolicyId, { title: string; sections: { h: string; p: string }[] }> = {
  privacy: {
    title: 'Privacy policy',
    sections: [
      { h: 'What we collect', p: 'Booking details, contact information, payment references and messages you send through the platform. Exact processors are listed when integrations are enabled.' },
      { h: 'How we use it', p: 'To fulfil transfers and tours, communicate about your trip, process payments and refunds, and improve operations. We do not sell personal data.' },
      { h: 'Your choices', p: 'You can request access, correction or deletion of account data subject to legal retention for completed bookings and invoices.' },
    ],
  },
  terms: {
    title: 'Terms & conditions',
    sections: [
      { h: 'Bookings', p: 'A booking is confirmed when payment succeeds or when a quotation is accepted under the terms shown at checkout for that service.' },
      { h: 'Passenger responsibilities', p: 'Provide accurate flight numbers, passenger counts and pickup instructions. Extra waiting time beyond the included allowance may be charged as shown before payment.' },
      { h: 'Service changes', p: 'Weather, road closures and safety may require route or vehicle changes. Material changes are communicated through booking messages.' },
    ],
  },
  cancellation: {
    title: 'Cancellation policy',
    sections: [
      { h: 'Before you pay', p: 'Cancellation windows and fees are shown per service at checkout. Free-cancellation cutoffs differ for airport transfers, tours and multi-day drivers.' },
      { h: 'How to cancel', p: 'Use Manage booking or your account messages. WhatsApp deep links are available when you need a faster channel.' },
      { h: 'No-shows', p: 'If the passenger is not present after the included waiting time and cannot be reached, the trip may be marked completed under the published no-show rules.' },
    ],
  },
  refund: {
    title: 'Refund policy',
    sections: [
      { h: 'Eligible refunds', p: 'Refunds follow the cancellation terms for the service and the payment method used. Historical booking prices stay snapshotted.' },
      { h: 'Timing', p: 'Approved refunds are initiated through the payment provider. Bank and card timelines vary by issuer and currency (EUR or ISK). Older bookings charged in USD keep that snapshot.' },
      { h: 'Partial refunds', p: 'When only part of a multi-day or multi-leg booking is cancelled, the remaining legs stay charged unless operations approve a full adjustment.' },
    ],
  },
}

type Props = {
  theme?: 'light' | 'dark'
  language?: Lang
  currency?: Currency
  policy?: PolicyId
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

function isPolicyId(v: string): v is PolicyId {
  return TABS.some((t) => t.id === v)
}

export default function Policies(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, policy: 'privacy' as PolicyId, ...props }
  const th = p.theme as 'light' | 'dark'
  const [policy, setPolicy] = useState<PolicyId>(isPolicyId(p.policy) ? p.policy : 'privacy')
  const doc = COPY[policy]

  useEffect(() => {
    if (p.policy && isPolicyId(p.policy)) setPolicy(p.policy)
  }, [p.policy])

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={p.currency as Currency}
      mobileTitle="Policies"
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
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <h1 className="font-display text-3xl font-extrabold text-heading sm:text-4xl">Policies</h1>
        <p className="mt-3 text-base text-muted">Privacy, terms, cancellation and refunds in one place. Final legal copy is CMS-editable.</p>

        <div className="mt-8 flex flex-wrap gap-1 rounded-2xl bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setPolicy(t.id)
                const url = new URL(window.location.href)
                url.searchParams.set('policy', t.id)
                window.history.replaceState({}, '', url.toString())
              }}
              className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold leading-snug transition-colors ${policy === t.id ? 'bg-bg text-heading shadow-sm' : 'text-muted'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <article className="mt-8">
          <h2 className="font-display text-2xl font-bold text-heading">{doc.title}</h2>
          <div className="mt-6 space-y-6">
            {doc.sections.map((s) => (
              <div key={s.h}>
                <h3 className="font-semibold text-heading">{s.h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.p}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PublicPageShell>
  )
}
