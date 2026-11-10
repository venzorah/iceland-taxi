'use client'

import CustomerDashboard from '@/components/screens/customer/CustomerDashboard'
import { useAppPrefs } from '@/components/providers/AppProviders'

export function AccountPageClient() {
  const prefs = useAppPrefs()
  return (
    <CustomerDashboard
      theme={prefs.theme}
      language={prefs.language}
      currency={prefs.currency}
      announcements={prefs.announcements}
      onThemeChange={prefs.setTheme}
      onLanguageChange={prefs.setLanguage}
      onCurrencyChange={prefs.setCurrency}
      onHome={() => prefs.go('/')}
      onBook={() => prefs.go('/book')}
    />
  )
}
