'use client'

import { useAppPrefs } from '@/components/providers/AppProviders'
import { PUBLIC_PATHS } from '@/lib/design/routes'

/** Shared prefs + navigation for Magic Patterns public pages. */
export function usePublicChrome() {
  const prefs = useAppPrefs()
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
    onSignIn: () => prefs.go(PUBLIC_PATHS.account),
    onStaff: () => prefs.go(PUBLIC_PATHS.admin),
    onStaffMobile: () => prefs.go(PUBLIC_PATHS.mobileAdmin),
    onDriver: () => prefs.go(PUBLIC_PATHS.driver),
    onAccount: () => prefs.go(PUBLIC_PATHS.account),
    onHelp: () => prefs.go(PUBLIC_PATHS.messages),
    onMessages: () => prefs.go(PUBLIC_PATHS.messages),
    onAirport: () => prefs.go(PUBLIC_PATHS.airportTransfer),
    onTours: () => prefs.go(PUBLIC_PATHS.privateTours),
    onPrivateDriver: () => prefs.go(PUBLIC_PATHS.privateDriver),
    go: prefs.go,
  }
}
