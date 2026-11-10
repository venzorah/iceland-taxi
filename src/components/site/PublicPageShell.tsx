'use client'

import React from 'react'

import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteTabBar } from '@/components/site/SiteTabBar'
import type { AnnouncementState } from '@/lib/design/announcements'
import type { Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'

type Props = {
  theme: 'light' | 'dark'
  language: Lang
  currency: Currency
  mobileTitle: string
  children: React.ReactNode
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
  activeTab?: 'home' | 'book' | 'trips' | 'help'
  hideFooter?: boolean
  hideTabBar?: boolean
}

/** Shared chrome for public marketing and utility pages. */
export function PublicPageShell({
  theme,
  language,
  currency,
  mobileTitle,
  children,
  onThemeChange,
  onLanguageChange,
  onCurrencyChange,
  onHome,
  onBook,
  onSignIn,
  onStaff,
  onStaffMobile,
  onDriver,
  onAccount,
  onHelp,
  announcements,
  activeTab = 'home',
  hideFooter,
  hideTabBar,
}: Props) {
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="bg-bg pb-[calc(4.75rem+env(safe-area-inset-bottom))] font-sans text-text md:pb-0">
        <SiteHeader
          theme={theme}
          language={language}
          currency={currency}
          onThemeChange={onThemeChange}
          onLanguageChange={onLanguageChange}
          onCurrencyChange={onCurrencyChange}
          onBook={onBook}
          onHome={onHome}
          onSignIn={onSignIn}
          mobileTitle={mobileTitle}
          onMobileBack={onHome}
          announcements={announcements}
        />
        {children}
        {!hideFooter && (
          <SiteFooter onStaff={onStaff} onStaffMobile={onStaffMobile} onDriver={onDriver} onAccount={onAccount} />
        )}
      </div>
      {!hideTabBar && (
        <SiteTabBar active={activeTab} onHome={onHome} onBook={onBook} onTrips={onAccount} onHelp={onHelp} />
      )}
    </div>
  )
}
