'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

import Booking from '@/components/screens/booking/Booking'
import { useAppPrefs } from '@/components/providers/AppProviders'

export function BookingPageClient() {
  const prefs = useAppPrefs()
  const params = useSearchParams()
  const [payState, setPayState] = useState<'default' | 'paying' | 'confirmed'>('default')

  return (
    <Booking
      theme={prefs.theme}
      language={prefs.language}
      currency={prefs.currency}
      customerCategory={prefs.customerCategory}
      announcements={prefs.announcements}
      pickup={params.get('pickup') || 'Keflavík Airport (KEF)'}
      destination={params.get('destination') || 'Reykjavík city centre'}
      date={params.get('date') || ''}
      time={params.get('time') || ''}
      passengers={Number(params.get('passengers') || 2)}
      state={payState}
      onThemeChange={prefs.setTheme}
      onLanguageChange={prefs.setLanguage}
      onCurrencyChange={prefs.setCurrency}
      onBack={() => prefs.go('/')}
      onPay={async () => {
        setPayState('paying')
        try {
          const res = await fetch('/api/payments/checkout', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              bookingRef: 'DRAFT',
              amount: prefs.currency === 'USD' ? 166 : 22900,
              currency: prefs.currency,
              description: 'Iceland Taxi Booking checkout',
            }),
          })
          const data = await res.json()
          if (!data.ok) {
            console.warn(data.message || data.error)
            setPayState('default')
            alert(data.message || 'Payment provider is not ready.')
            return
          }
          setPayState('confirmed')
        } catch (e) {
          console.error(e)
          setPayState('default')
          alert('Payment request failed.')
        }
      }}
    />
  )
}
