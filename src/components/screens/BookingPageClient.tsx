'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import Booking, { type BookingPayPayload } from '@/components/screens/booking/Booking'
import { useAppPrefs } from '@/components/providers/AppProviders'
import { formatChargedAmount, formatPrice } from '@/lib/design/data'

export function BookingPageClient() {
  const prefs = useAppPrefs()
  const params = useSearchParams()
  const [payState, setPayState] = useState<'default' | 'paying' | 'confirmed'>('default')
  const [confirmation, setConfirmation] = useState<{
    ref: string
    email: string
    statusLabel: string
    totalLabel: string
  }>()
  const [error, setError] = useState<string | null>(null)

  const pickup = params.get('pickup') || 'Keflavík Airport (KEF)'
  const destination = params.get('destination') || 'Reykjavík city centre'
  const date = params.get('date') || new Date().toISOString().slice(0, 10)
  const time = params.get('time') || '15:30'
  const passengers = Number(params.get('passengers') || 2)

  const pickupAt = useMemo(() => {
    try {
      return new Date(`${date}T${time}:00`).toISOString()
    } catch {
      return undefined
    }
  }, [date, time])

  useEffect(() => {
    const ref = params.get('ref')
    const payment = params.get('payment')
    if (!ref || !payment) return
    let cancelled = false
    setPayState('paying')
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/payments/teya/status?ref=${encodeURIComponent(ref)}`)
        const data = await res.json()
        if (cancelled) return
        if (data.paid === true && data.outcome === 'success') {
          setConfirmation({
            ref: data.ref || ref,
            email: data.email || '',
            statusLabel: data.statusLabel || 'Confirmed · payment received',
            totalLabel: data.totalLabel || '',
          })
          setPayState('confirmed')
          return
        }
        setPayState('default')
        setError(data.message || 'Teya did not confirm this payment. It was not marked paid.')
      } catch {
        if (!cancelled) {
          setPayState('default')
          setError('Could not confirm the payment with Teya. It was not marked paid.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params])

  const onPay = async (payload: BookingPayPayload) => {
    setPayState('paying')
    setError(null)
    try {
      const category =
        payload.category === 'resident' || payload.category === 'RESIDENT' ? 'RESIDENT' : 'INTERNATIONAL'
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          create: {
            guestName: payload.guestName,
            guestEmail: payload.guestEmail,
            guestPhone: payload.guestPhone,
            serviceLabel: 'Airport transfer',
            routeLabel: `${pickup} → ${destination}`,
            pickupAt,
            passengers,
            luggage: 2,
            flightNumber: payload.flight,
            vehicleLabel: payload.vehicle,
            extras: payload.extras,
            customerCategory: category,
            currency: payload.currency,
            notes: payload.hotel ? `Hotel/address: ${payload.hotel}` : undefined,
            isQuote: Boolean(payload.isQuote),
          },
          description: `Iceland Taxi Booking · ${pickup} → ${destination}`,
        }),
      })
      const data = await res.json()
      if (!res.ok && !data.ok) {
        setPayState('default')
        setError(data.message || 'Checkout failed')
        return
      }

      if (data.demo && !payload.isQuote) {
        setPayState('default')
        setError(data.message || 'Payment was not sent to Teya.')
        return
      }

      if (data.checkoutUrl && data.demo !== true) {
        window.location.href = data.checkoutUrl
        return
      }

      if (!data.checkoutUrl && !payload.isQuote) {
        setPayState('default')
        setError('Teya did not return a checkout session. The booking was not marked paid.')
        return
      }

      const booking = data.booking
      const charged = (booking?.currency || payload.currency) as 'EUR' | 'ISK' | 'USD'
      const amount = booking?.amountSnapshot
      const status = booking?.status || 'AWAITING_PAYMENT'
      const statusLabel =
        status === 'PENDING'
          ? 'Quotation pending'
          : status === 'AWAITING_PAYMENT'
            ? 'Awaiting Payment'
            : status === 'CONFIRMED'
              ? 'Confirmed · awaiting driver assignment'
              : String(status)

      setConfirmation({
        ref: booking?.ref || 'ITB-UNKNOWN',
        email: payload.guestEmail,
        statusLabel,
        totalLabel:
          typeof amount === 'number'
            ? formatChargedAmount(amount, charged)
            : formatPrice(payload.totalIsk, charged === 'ISK' ? 'ISK' : 'EUR'),
      })
      setPayState('confirmed')
    } catch (e) {
      console.error(e)
      setPayState('default')
      setError('Payment request failed.')
    }
  }

  return (
    <>
      {error && payState !== 'confirmed' && (
        <div className="fixed inset-x-0 top-0 z-50 bg-error px-4 py-2 text-center text-sm font-semibold text-white">
          {error}
        </div>
      )}
      {error && payState === 'confirmed' && (
        <div className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 bg-navy px-4 py-2 text-center text-xs font-medium text-white/90">
          {error}
        </div>
      )}
      <Booking
        theme={prefs.theme}
        language={prefs.language}
        currency={prefs.currency}
        customerCategory={prefs.customerCategory}
        announcements={prefs.announcements}
        pickup={pickup}
        destination={destination}
        date={date}
        time={time}
        passengers={passengers}
        state={payState}
        confirmation={confirmation}
        onThemeChange={prefs.setTheme}
        onLanguageChange={prefs.setLanguage}
        onCurrencyChange={prefs.setCurrency}
        onBack={() => prefs.go('/')}
        onPay={onPay}
      />
    </>
  )
}
