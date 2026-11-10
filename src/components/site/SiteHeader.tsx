'use client'

import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Menu, Moon, Sun, UserRound } from 'lucide-react'

import { AnnouncementBar } from '@/components/site/AnnouncementBar'
import { BottomSheet } from '@/components/site/BottomSheet'
import { ANNOUNCEMENTS_SEED, visibleAnnouncements, type AnnouncementState } from '@/lib/design/announcements'
import { LOGO_DARK, LOGO_LIGHT, type Currency } from '@/lib/design/data'
import { t, type Lang } from '@/lib/design/i18n'
import { HEADER_NAV } from '@/lib/design/routes'

type Props = {
  theme: 'light' | 'dark'
  language: Lang
  currency: Currency
  onThemeChange?: (t: 'light' | 'dark') => void
  onLanguageChange?: (l: Lang) => void
  onCurrencyChange?: (c: Currency) => void
  onBook?: () => void
  onHome?: () => void
  onSignIn?: () => void
  /** On phones, swaps the logo for a back button and this screen title, like a native app bar. */
  mobileTitle?: string
  onMobileBack?: () => void
  /** Announcement bar content, managed in Admin → Announcements. */
  announcements?: AnnouncementState
}

export function SiteHeader({ theme, language, currency, onThemeChange, onLanguageChange, onCurrencyChange, onBook, onHome, onSignIn, mobileTitle, onMobileBack, announcements = ANNOUNCEMENTS_SEED }: Props) {
  const [open, setOpen] = useState(false)
  const hasBar = visibleAnnouncements(announcements).length > 0
  const nav = HEADER_NAV.map((item) => ({ label: t(language, item.i18n), href: item.href }))

  return (
    <>
    {/* Holds the page content below the fixed bar + menu */}
    <div aria-hidden className={hasBar ? 'h-[92px] sm:h-[116px] lg:h-[132px]' : 'h-14 sm:h-20 lg:h-24'} />
    <div className="fixed inset-x-0 top-0 z-40">
    <AnnouncementBar state={announcements} language={language} />
    <header className="border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:h-20 sm:gap-6 sm:px-6 lg:h-24 lg:px-8">
        {mobileTitle && (
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:hidden">
            <button onClick={onMobileBack} aria-label="Back" className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-heading active:bg-surface">
              <ChevronLeft size={24} />
            </button>
            <p className="truncate font-display text-base font-bold text-heading">{mobileTitle}</p>
          </div>
        )}
        <button onClick={onHome} className={`shrink-0 ${mobileTitle ? 'hidden sm:block' : ''}`} aria-label="Iceland Taxi Booking home">
          <img src={theme === 'dark' ? LOGO_DARK : LOGO_LIGHT} alt="Iceland Taxi Booking" className="h-10 w-auto sm:h-14 lg:h-[72px]" />
        </button>

        <nav className="hidden flex-1 items-center gap-6 xl:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="whitespace-nowrap text-sm font-medium text-text transition-colors duration-150 hover:text-link">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
          <div className="hidden items-center rounded-full border border-line p-0.5 text-xs font-semibold md:flex">
            {(['en', 'is'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => onLanguageChange?.(l)}
                className={`rounded-full px-2.5 py-1 uppercase transition-colors duration-150 ${language === l ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted hover:text-heading'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="hidden items-center rounded-full border border-line p-0.5 text-xs font-semibold md:flex">
            {(['EUR', 'ISK'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => onCurrencyChange?.(c)}
                className={`rounded-full px-2.5 py-1 transition-colors duration-150 ${currency === c ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted hover:text-heading'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={() => onThemeChange?.(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="grid h-10 w-10 place-items-center rounded-full text-heading transition-colors duration-150 hover:bg-surface active:bg-surface sm:h-9 sm:w-9 sm:border sm:border-line"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={onSignIn} className="hidden whitespace-nowrap px-2 text-sm font-semibold text-heading lg:block">
            {t(language, 'signIn')}
          </button>
          <button
            onClick={onBook}
            className="hidden whitespace-nowrap rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover md:block"
          >
            {t(language, 'book')}
          </button>
          <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full text-heading active:bg-surface xl:hidden" aria-label="Menu" aria-expanded={open}>
            <Menu size={22} />
          </button>
        </div>
      </div>
    </header>
    </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Menu" hideFrom="xl">
        <ul className="-mx-1">
          {nav.map((n) => (
            <li key={n.href}>
              <a href={n.href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-1 py-3.5 text-base font-semibold text-heading active:bg-surface">
                {n.label} <ChevronRight size={18} className="text-muted" />
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs font-semibold text-muted">Language</p>
        <Segmented
          value={language}
          options={[['en', 'English'], ['is', 'Íslenska']]}
          onChange={(v) => onLanguageChange?.(v as Lang)}
        />
        <p className="mt-4 text-xs font-semibold text-muted">Currency</p>
        <Segmented
          value={currency}
          options={[['EUR', 'EUR €'], ['ISK', 'ISK']]}
          onChange={(v) => onCurrencyChange?.(v as Currency)}
        />

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setOpen(false)
              onSignIn?.()
            }}
            className="flex items-center justify-center gap-2 rounded-2xl border border-line py-3.5 text-sm font-semibold text-heading active:bg-surface"
          >
            <UserRound size={17} /> {t(language, 'signIn')}
          </button>
          <button
            onClick={() => {
              setOpen(false)
              onBook?.()
            }}
            className="rounded-2xl bg-primary py-3.5 text-sm font-bold text-on-primary active:bg-primary-hover"
          >
            {t(language, 'book')}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}

function Segmented({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="mt-2 grid grid-cols-2 rounded-2xl bg-surface p-1 text-sm font-semibold">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-xl py-2.5 transition-colors duration-150 ${value === v ? 'bg-bg text-heading shadow-sm' : 'text-muted'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
