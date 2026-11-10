'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { ANNOUNCEMENTS_SEED, type AnnouncementState } from '@/lib/design/announcements'
import type { Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'

type Theme = 'light' | 'dark'

type AppPrefs = {
  theme: Theme
  language: Lang
  currency: Currency
  customerCategory: 'international' | 'resident'
  announcements: AnnouncementState
  setTheme: (t: Theme) => void
  setLanguage: (l: Lang) => void
  setCurrency: (c: Currency) => void
  setCustomerCategory: (c: 'international' | 'resident') => void
  setAnnouncements: (a: AnnouncementState) => void
  go: (path: string) => void
}

const AppContext = createContext<AppPrefs | null>(null)

export function AppProviders({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [theme, setThemeState] = useState<Theme>('light')
  const [language, setLanguage] = useState<Lang>('en')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [customerCategory, setCustomerCategory] = useState<'international' | 'resident'>('international')
  const [announcements, setAnnouncements] = useState<AnnouncementState>(ANNOUNCEMENTS_SEED)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.lang = language
  }, [theme, language])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const go = useCallback((path: string) => router.push(path), [router])

  const value = useMemo(
    () => ({
      theme,
      language,
      currency,
      customerCategory,
      announcements,
      setTheme,
      setLanguage,
      setCurrency,
      setCustomerCategory,
      setAnnouncements,
      go,
    }),
    [theme, language, currency, customerCategory, announcements, setTheme, go],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppPrefs() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppPrefs must be used within AppProviders')
  return ctx
}
