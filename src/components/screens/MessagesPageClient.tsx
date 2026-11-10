'use client'

import MessagesInbox from '@/components/screens/messages/MessagesInbox'
import { useAppPrefs } from '@/components/providers/AppProviders'

export function MessagesPageClient() {
  const prefs = useAppPrefs()
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
      onAccount={() => prefs.go('/account')}
      onSignIn={() => prefs.go('/account')}
    />
  )
}
