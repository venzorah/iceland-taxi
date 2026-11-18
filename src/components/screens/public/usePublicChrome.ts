'use client'

import { useAppPrefs } from '@/components/providers/AppProviders'
import { PUBLIC_PATHS } from '@/lib/design/routes'
import { useSiteSession } from '@/components/providers/SessionProvider'

/** Shared prefs + navigation for KM Consulting & Tech public pages. */
export function usePublicChrome() {
  const prefs = useAppPrefs()
  const { accountHref } = useSiteSession()
  return {
    theme: prefs.theme,
    language: prefs.language,
    currency: prefs.currency,
    announcements: prefs.announcements,
    onThemeChange: prefs.setTheme,
    onLanguageChange: prefs.setLanguage,
    onCurrencyChange: prefs.setCurrency,
    onHome: () => prefs.go(PUBLIC_PATHS.home),
    onBook: () => prefs.go(PUBLIC_PATHS.book),
    onSignIn: () => prefs.go(accountHref),
    onStaff: () => prefs.go(PUBLIC_PATHS.admin),
    onStaffMobile: () => prefs.go(PUBLIC_PATHS.mobileAdmin),
    onDriver: () => prefs.go(PUBLIC_PATHS.driver),
    onAccount: () => prefs.go(accountHref),
    onHelp: () => prefs.go(PUBLIC_PATHS.messages),
    onMessages: () => prefs.go(PUBLIC_PATHS.messages),
    onAirport: () => prefs.go(PUBLIC_PATHS.airportTransfer),
    onTours: () => prefs.go(PUBLIC_PATHS.privateTours),
    onPrivateDriver: () => prefs.go(PUBLIC_PATHS.privateDriver),
    go: prefs.go,
  }
}
