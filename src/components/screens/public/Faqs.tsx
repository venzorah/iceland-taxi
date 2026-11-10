'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'

import { PublicPageShell } from '@/components/site/PublicPageShell'
import { FAQS, type Currency } from '@/lib/design/data'
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
  onContact?: () => void
  announcements?: AnnouncementState
}

const EXTRA = [
  { q: 'Do you offer shared airport shuttles?', a: 'No. Transfers are private bookings for your party only. Vehicle class and capacity are selected during checkout.' },
  { q: 'Can I pay on arrival?', a: 'Payment options are controlled per service. When prepayment is required, checkout shows the amount and currency before you confirm.' },
  { q: 'How do I get Icelandic support?', a: 'Switch the site language to Íslenska. Booking confirmations and many CMS pages are authored in both English and Icelandic.' },
]

export default function Faqs(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, ...props }
  const th = p.theme as 'light' | 'dark'
  const items = [...FAQS, ...EXTRA]
  const [open, setOpen] = useState<number | null>(0)
  const goContact = p.onContact || p.onHome

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={p.currency as Currency}
      mobileTitle="FAQs"
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
        <h1 className="font-display text-3xl font-extrabold text-heading sm:text-center sm:text-4xl">Frequently asked questions</h1>
        <p className="mt-3 text-base text-muted sm:text-center">Answers guests ask before booking. More FAQs can be published from the CMS.</p>

        <div className="mt-10 divide-y divide-line border-y border-line">
          {items.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-start justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-display text-base font-bold text-heading sm:text-lg">{f.q}</span>
                  <Plus size={18} className={`mt-1 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-45' : ''}`} />
                </button>
                {isOpen && <p className="pb-5 text-sm leading-relaxed text-muted">{f.a}</p>}
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          Still need help?{' '}
          <button onClick={goContact} className="font-semibold text-link hover:underline">
            Message us from Contact
          </button>
        </p>
      </section>
    </PublicPageShell>
  )
}
