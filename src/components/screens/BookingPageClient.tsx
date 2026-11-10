'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { CustomEnquiryForm, type EnquiryPayload } from '@/components/booking/CustomEnquiryForm'
import { usePublishedListings } from '@/components/booking/usePublishedListings'
import Booking, { type BookingPayPayload } from '@/components/screens/booking/Booking'
import { useAppPrefs } from '@/components/providers/AppProviders'
import { UNAVAILABLE_MESSAGE, listingLabel, matchListing } from '@/lib/booking/listings'
import { formatChargedAmount, formatPrice } from '@/lib/design/data'

export function BookingPageClient() {
  const prefs = useAppPrefs()
  const router = useRouter()
  const params = useSearchParams()
  const listings = usePublishedListings()
  const [payState, setPayState] = useState<'default' | 'paying' | 'confirmed'>('default')
  const [confirmation, setConfirmation] = useState<{
    ref: string
    email: string
    statusLabel: string
    totalLabel: string
  }>()
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState(prefs.customerCategory === 'resident' ? 'RESIDENT' : 'INTERNATIONAL')
  const [payCurrency, setPayCurrency] = useState<'EUR' | 'ISK'>(prefs.currency === 'ISK' ? 'ISK' : 'EUR')
  const [chargedLabel, setChargedLabel] = useState<string | null>(null)
  const [quoteReady, setQuoteReady] = useState(false)
  const [enquiryStatus, setEnquiryStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [enquiryError, setEnquiryError] = useState<string | null>(null)

  const listingId = params.get('listing')
  const listingKind = params.get('kind')
  const enquiryOnly = params.get('enquiry') === '1' && !listingId
  const pickup = params.get('pickup') || ''
  const destination = params.get('destination') || ''
  const date = params.get('date') || new Date().toISOString().slice(0, 10)
  const time = params.get('time') || '15:30'
  const passengers = Number(params.get('passengers') || 2)
  const quoteCurrency = category === 'RESIDENT' ? payCurrency : 'EUR'

  const listing = useMemo(() => {
    if (!listings || enquiryOnly) return null
    return matchListing(listings, { listingId, listingKind, pickup, destination })
  }, [listings, enquiryOnly, listingId, listingKind, pickup, destination])

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

  useEffect(() => {
    if (!listing) {
      setQuoteReady(false)
      setChargedLabel(null)
      return
    }
    let cancelled = false
    setQuoteReady(false)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch('/api/bookings/quote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            listingId: listing.id,
            listingKind: listing.kind,
            customerCategory: category,
            currency: quoteCurrency,
          }),
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data.ok || data.quote?.amountIskSnapshot !== listing.fromIsk) {
          setQuoteReady(false)
          setChargedLabel(null)
          setError(data.message || UNAVAILABLE_MESSAGE)
          return
        }
        const charged = data.quote.currency === 'ISK' ? 'ISK' : 'EUR'
        setChargedLabel(formatChargedAmount(data.quote.amountSnapshot, charged))
        setQuoteReady(true)
      } catch {
        if (!cancelled) {
          setQuoteReady(false)
          setError(UNAVAILABLE_MESSAGE)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [listing, category, quoteCurrency])

  const onPay = async (payload: BookingPayPayload) => {
    if (!listing) {
      setError(UNAVAILABLE_MESSAGE)
      return
    }
    setPayState('paying')
    setError(null)
    try {
      const nextCategory = payload.category === 'resident' || payload.category === 'RESIDENT' ? 'RESIDENT' : 'INTERNATIONAL'
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          create: {
            guestName: payload.guestName,
            guestEmail: payload.guestEmail,
            guestPhone: payload.guestPhone,
            listingId: listing.id,
            listingKind: listing.kind,
            pickupAt,
            passengers,
            luggage: 0,
            flightNumber: payload.flight,
            vehicleLabel: payload.vehicle,
            extras: payload.extras,
            customerCategory: nextCategory,
            currency: nextCategory === 'INTERNATIONAL' ? 'EUR' : payload.currency,
            notes: payload.hotel ? `Pickup details: ${payload.hotel}` : undefined,
          },
          description: `Iceland Taxi Booking · ${listingLabel(listing)}`,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setPayState('default')
        setError(data.message || UNAVAILABLE_MESSAGE)
        return
      }
      if (data.booking?.listingId !== listing.id || data.booking?.adminPriceIsk !== listing.fromIsk) {
        setPayState('default')
        setError(UNAVAILABLE_MESSAGE)
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
      if (!data.checkoutUrl) {
        setPayState('default')
        setError('Teya did not return a checkout session. The booking was not marked paid.')
        return
      }
    } catch (e) {
      console.error(e)
      setPayState('default')
      setError('Payment request failed.')
    }
  }

  const sendEnquiry = async (payload: EnquiryPayload) => {
    setEnquiryStatus('sending')
    setEnquiryError(null)
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setEnquiryStatus('idle')
        setEnquiryError(data.message || 'Could not send the enquiry')
        return
      }
      setEnquiryStatus('sent')
    } catch {
      setEnquiryStatus('idle')
      setEnquiryError('Could not send the enquiry')
    }
  }

  const showEnquiry = enquiryOnly || (listings !== null && !listing && Boolean(listingId || pickup || destination))
  const showPicker = listings !== null && !listing && !showEnquiry

  if (payState === 'confirmed' && confirmation) {
    return (
      <Booking
        theme={prefs.theme}
        language={prefs.language}
        currency={quoteCurrency}
        announcements={prefs.announcements}
        listing={listing}
        pickup={listing?.fromLabel || pickup}
        destination={listing?.toLabel || destination}
        date={date}
        time={time}
        passengers={passengers}
        state="confirmed"
        confirmation={confirmation}
        onThemeChange={prefs.setTheme}
        onLanguageChange={prefs.setLanguage}
        onCurrencyChange={prefs.setCurrency}
        onBack={() => prefs.go('/')}
      />
    )
  }

  return (
    <>
      {error && (
        <div className="fixed inset-x-0 top-0 z-50 bg-error px-4 py-2 text-center text-sm font-semibold text-white">
          {error}
        </div>
      )}
      {listing ? (
        <Booking
          theme={prefs.theme}
          language={prefs.language}
          currency={quoteCurrency}
          customerCategory={category === 'RESIDENT' ? 'resident' : 'international'}
          announcements={prefs.announcements}
          listing={listing}
          quoteReady={quoteReady}
          chargedLabel={chargedLabel}
          unavailableMessage={quoteReady ? null : error}
          pickup={listing.fromLabel}
          destination={listing.toLabel}
          date={date}
          time={time}
          passengers={passengers}
          state={payState}
          confirmation={confirmation}
          onThemeChange={prefs.setTheme}
          onLanguageChange={prefs.setLanguage}
          onCurrencyChange={(next) => {
            setPayCurrency(next === 'ISK' ? 'ISK' : 'EUR')
            prefs.setCurrency(next === 'ISK' ? 'ISK' : 'EUR')
          }}
          onCategoryChange={(next) => setCategory(next === 'resident' ? 'RESIDENT' : 'INTERNATIONAL')}
          onBack={() => prefs.go('/')}
          onStartEnquiry={() => {
            const q = new URLSearchParams({
              enquiry: '1',
              pickup: listing.fromLabel,
              destination: listing.toLabel,
              date,
              time,
              passengers: String(passengers),
            })
            router.push(`/book?${q.toString()}`)
          }}
          onPay={onPay}
        />
      ) : (
        <div className="min-h-screen bg-surface px-4 py-8 text-text sm:px-6">
          <div className="mx-auto max-w-3xl">
            <button onClick={() => prefs.go('/')} className="text-sm font-semibold text-link">Back</button>
            <h1 className="mt-4 font-display text-3xl font-bold text-heading">Book a published trip</h1>
            {listings === null && <p className="mt-4 text-sm text-muted">Loading published prices…</p>}
            {showEnquiry && (
              <div className="mt-6 space-y-4">
                <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm font-semibold text-heading">{UNAVAILABLE_MESSAGE}</p>
                <CustomEnquiryForm
                  status={enquiryStatus}
                  error={enquiryError}
                  initial={{ fromLabel: pickup, toLabel: destination, tripDate: date, tripTime: time, passengers }}
                  onSubmit={sendEnquiry}
                />
              </div>
            )}
            {showPicker && (
              <div className="mt-6 space-y-6">
                {listings.length === 0 ? (
                  <p className="text-sm text-muted">No published price is available yet.</p>
                ) : (
                  <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
                    {listings.map((item) => (
                      <li key={`${item.kind}-${item.id}`}>
                        <button
                          onClick={() => router.push(`/book?listing=${encodeURIComponent(item.id)}&kind=${item.kind}`)}
                          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                        >
                          <span>
                            <span className="block font-semibold text-heading">{listingLabel(item)}</span>
                            <span className="block text-xs text-muted">{item.title}</span>
                          </span>
                          <span className="font-display text-lg font-bold text-heading">{formatPrice(item.fromIsk, prefs.currency === 'ISK' ? 'ISK' : 'EUR')}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <CustomEnquiryForm status={enquiryStatus} error={enquiryError} onSubmit={sendEnquiry} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
