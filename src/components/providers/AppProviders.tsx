'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useSiteSession } from './SessionProvider'
import { SessionProvider } from './SessionProvider'

import { MessageAlerts } from '@/components/alerts/MessageAlerts'
import { InstallPrompt } from '@/components/site/InstallPrompt'
import { WelcomeSplash } from '@/components/site/WelcomeSplash'
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
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [customerCategory, setCustomerCategory] = useState<'international' | 'resident'>('international')
  const [announcements, setAnnouncementsState] = useState<AnnouncementState>(ANNOUNCEMENTS_SEED)
  const announcementSave = useRef<number | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.lang = language
  }, [theme, language])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const go = useCallback((path: string) => router.push(path), [router])
  const setAnnouncements = useCallback((next: AnnouncementState) => {
    setAnnouncementsState(next)
    if (announcementSave.current) window.clearTimeout(announcementSave.current)
    announcementSave.current = window.setTimeout(() => {
      fetch('/api/announcements', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => undefined)
    }, 400)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/appearance')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.appearance?.defaultLang === 'is') setLanguage('is')
      })
      .catch(() => undefined)
    fetch('/api/announcements')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.announcements) setAnnouncementsState(data.announcements)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

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
    [theme, language, currency, customerCategory, announcements, setTheme, setAnnouncements, go],
  )

  return (
    <AppContext.Provider value={value}>
      <SessionProvider>
      <CustomerPreferencesSync />
      <WelcomeSplash />
      <InstallPrompt />
      <MessageAlerts />
      {children}
      </SessionProvider>
    </AppContext.Provider>
  )
}

export function useAppPrefs() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppPrefs must be used within AppProviders')
  return ctx
}

function CustomerPreferencesSync() {
  const { user } = useSiteSession()
  const { setCurrency, setLanguage, setCustomerCategory } = useAppPrefs()
  useEffect(() => {
    if (user?.role !== 'CUSTOMER') return
    const controller = new AbortController()
    const load = async () => {
      try {
        const response = await fetch('/api/account/profile', { signal: controller.signal, cache: 'no-store' })
        const data = await response.json()
        if (!response.ok || !data.profile || controller.signal.aborted) return
        setCurrency(data.profile.preferredCurrency === 'ISK' ? 'ISK' : 'EUR')
        setLanguage(data.profile.preferredLang === 'is' ? 'is' : 'en')
        setCustomerCategory(data.profile.category === 'RESIDENT' ? 'resident' : 'international')
      } catch { /* The profile screen reports errors and allows retrying. */ }
    }
    void load()
    window.addEventListener('itb-profile-updated', load)
    return () => { controller.abort(); window.removeEventListener('itb-profile-updated', load) }
  }, [user?.id, user?.role, setCurrency, setLanguage, setCustomerCategory])
  return null
}
