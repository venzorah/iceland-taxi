'use client'

import Homepage from '@/components/screens/homepage/Homepage'
import { useAppPrefs } from '@/components/providers/AppProviders'
import type { SearchPayload } from '@/components/screens/homepage/BookingSearch'

export function HomePageClient() {
  const prefs = useAppPrefs()

  const onSearch = (s: SearchPayload) => {
    if (s.enquiry) {
      const q = new URLSearchParams({
        enquiry: '1',
        pickup: s.pickup,
        destination: s.destination,
        date: s.date || '',
        time: s.time || '',
        passengers: String(s.passengers),
      })
      prefs.go(`/book?${q.toString()}`)
      return
    }
    if (s.listingId && s.listingKind) {
      const q = new URLSearchParams({
        listing: s.listingId,
        kind: s.listingKind,
        date: s.date || '',
        time: s.time || '',
        passengers: String(s.passengers),
      })
      prefs.go(`/book?${q.toString()}`)
      return
    }
    const q = new URLSearchParams({
      pickup: s.pickup,
      destination: s.destination,
      date: s.date || '',
      time: s.time || '',
      passengers: String(s.passengers),
      category: s.category,
    })
    prefs.go(`/book?${q.toString()}`)
  }

  return (
    <Homepage
      theme={prefs.theme}
      language={prefs.language}
      currency={prefs.currency}
      announcements={prefs.announcements}
      onThemeChange={prefs.setTheme}
      onLanguageChange={prefs.setLanguage}
      onCurrencyChange={prefs.setCurrency}
      onSearch={onSearch}
      onSignIn={() => prefs.go('/account')}
      onStaff={() => prefs.go('/admin')}
      onStaffMobile={() => prefs.go('/m')}
      onDriver={() => prefs.go('/driver')}
      onMessages={() => prefs.go('/messages')}
    />
  )
}
