'use client'

import MessagesInbox from '@/components/screens/messages/MessagesInbox'
import { useAppPrefs } from '@/components/providers/AppProviders'
import { useSiteSession } from '@/components/providers/SessionProvider'

export function MessagesPageClient() {
  const prefs = useAppPrefs()
  const { accountHref } = useSiteSession()
  return (
    <MessagesInbox
      theme={prefs.theme}
      language={prefs.language}
      currency={prefs.currency}
      announcements={prefs.announcements}
      onThemeChange={prefs.setTheme}
      onLanguageChange={prefs.setLanguage}
      onCurrencyChange={prefs.setCurrency}
      onHome={() => prefs.go('/')}
      onBook={() => prefs.go('/book')}
      onAccount={() => prefs.go(accountHref)}
      onSignIn={() => prefs.go(accountHref)}
    />
  )
}
