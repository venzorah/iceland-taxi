'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'
import { useSiteSession } from '@/components/providers/SessionProvider'
import { pickupInstant } from '@/lib/booking/pickup'
import { CustomEnquiryForm, type EnquiryPayload } from '@/components/booking/CustomEnquiryForm'
import { usePublishedListings } from '@/components/booking/usePublishedListings'
import Booking, { type BookingPayPayload, type BookingVehicle } from '@/components/screens/booking/Booking'
import { useAppPrefs } from '@/components/providers/AppProviders'
import { UNAVAILABLE_MESSAGE, listingLabel, matchListing, searchListings } from '@/lib/booking/listings'
import { formatChargedAmount, formatPrice } from '@/lib/design/data'

export function BookingPageClient() {
  const prefs = useAppPrefs()
  const router = useRouter()
  const params = useSearchParams()
  const listings = usePublishedListings()
  const { user } = useSiteSession()
  const requestKey = useRef('')
  const requestBody = useRef('')
  const [savedRef, setSavedRef] = useState('')
  const [savedStatus, setSavedStatus] = useState('')
  const [canRetryPayment, setCanRetryPayment] = useState(true)
  const [profile, setProfile] = useState<{ name?: string | null; email?: string; phone?: string | null }>()
  useEffect(() => {
    if (user?.role !== 'CUSTOMER') { setProfile(undefined); return }
    setProfile({ name: user.name, email: user.email })
    const controller = new AbortController()
    fetch('/api/account/profile', { signal: controller.signal }).then(async r => { const d = await r.json(); if (r.ok && !controller.signal.aborted) setProfile(d.profile) }).catch(() => {})
    return () => controller.abort()
  }, [user?.id, user?.name, user?.email, user?.role])
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
  const categoryTouched = useRef(false)
  const currencyTouched = useRef(false)
  useEffect(() => { if (!categoryTouched.current) setCategory(prefs.customerCategory === 'resident' ? 'RESIDENT' : 'INTERNATIONAL') }, [prefs.customerCategory])
  useEffect(() => { if (!currencyTouched.current) setPayCurrency(prefs.currency === 'ISK' ? 'ISK' : 'EUR') }, [prefs.currency])
  const [chargedLabel, setChargedLabel] = useState<string | null>(null)
  const [quoteReady, setQuoteReady] = useState(false)
  const [vehicles, setVehicles] = useState<BookingVehicle[] | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<BookingVehicle | null>(null)
  const [enquiryStatus, setEnquiryStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [enquiryError, setEnquiryError] = useState<string | null>(null)

  const listingId = params.get('listing')
  const listingKind = params.get('kind')
  const enquiryOnly = params.get('enquiry') === '1' && !listingId
  const pickup = params.get('pickup') || ''
  const destination = params.get('destination') || ''
  const date = params.get('date') || ''
  const time = params.get('time') || ''
  const passengers = Number(params.get('passengers') || 1)
  const luggage = Math.max(0, Number(params.get('luggage') || 0))
  const quoteCurrency = category === 'RESIDENT' ? payCurrency : 'EUR'

  const listing = useMemo(() => {
    if (!listings || enquiryOnly) return null
    return matchListing(listings, { listingId, listingKind, pickup, destination })
  }, [listings, enquiryOnly, listingId, listingKind, pickup, destination])

  const pickupAt = pickupInstant(date, time)?.toISOString()

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
        setSavedRef(ref)
        setSavedStatus(data.statusLabel || 'Payment has not been confirmed.')
        setCanRetryPayment(res.ok && ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(data.bookingStatus) && data.outcome !== 'refunded')
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
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/vehicles')
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data.ok) throw new Error(data.message || 'Vehicles could not be loaded.')
        const rows = Array.isArray(data.vehicles) ? data.vehicles : []
        setVehicles(
          rows.map((vehicle: BookingVehicle) => ({
            id: vehicle.id,
            name: vehicle.name,
            pax: vehicle.pax,
            bags: vehicle.bags,
            upgradeIsk: Math.max(0, Number(vehicle.upgradeIsk) || 0),
          })),
        )
      } catch {
        if (!cancelled) { setVehicles([]); setError('Vehicles could not be loaded. Refresh to try again.') }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!listing || vehicles === null || vehicles.length === 0) {
      setQuoteReady(false)
      setChargedLabel(null)
      return
    }
    if (vehicles.length > 0 && !selectedVehicle?.id) return
    let cancelled = false
    setQuoteReady(false)
    setChargedLabel(null)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch('/api/bookings/quote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            listingId: listing.id,
            listingKind: listing.kind,
            vehicleId: selectedVehicle?.id,
            customerCategory: category,
            currency: quoteCurrency,
          }),
        })
        const data = await res.json()
        if (cancelled) return
        const upgrade = Math.max(0, Number(data.meta?.vehicleUpgradeIsk) || 0)
        const pricedVehicleId = data.meta?.vehicleId as string | undefined
        const matchesVehicle = !selectedVehicle?.id || pricedVehicleId === selectedVehicle.id
        if (!res.ok || !data.ok || !matchesVehicle || data.quote?.amountIskSnapshot !== listing.fromIsk + upgrade) {
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
  }, [listing, category, quoteCurrency, vehicles, selectedVehicle])

  const onPay = async (payload: BookingPayPayload) => {
    if (!listing) {
      setError(UNAVAILABLE_MESSAGE)
      return
    }
    if (!pickupAt || new Date(pickupAt) <= new Date()) { setError('Choose a future pickup date and time in Iceland.'); return }
    const fingerprint = JSON.stringify({ payload, pickupAt, passengers, luggage, listingId: listing.id })
    if (requestBody.current !== fingerprint) { requestBody.current = fingerprint; requestKey.current = crypto.randomUUID() }
    setPayState('paying')
    setError(null)
    try {
      const nextCategory = payload.category === 'resident' || payload.category === 'RESIDENT' ? 'RESIDENT' : 'INTERNATIONAL'
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestKey: requestKey.current,
          create: {
            guestName: payload.guestName,
            guestEmail: payload.guestEmail,
            guestPhone: payload.guestPhone,
            listingId: listing.id,
            listingKind: listing.kind,
            pickupAt,
            passengers,
            luggage,
            flightNumber: payload.flight,
            pickupAddress: payload.pickupAddress || undefined,
            vehicleId: payload.vehicleId,
            vehicleLabel: payload.vehicle,
            extras: payload.extras,
            customerCategory: nextCategory,
            currency: nextCategory === 'INTERNATIONAL' ? 'EUR' : payload.currency,
            notes: undefined,
          },
          description: `Iceland Taxi Booking · ${listingLabel(listing)}`,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data.bookingRef) setSavedRef(data.bookingRef)
        setPayState('default')
        setError(data.message || UNAVAILABLE_MESSAGE)
        return
      }
      const upgrade = Math.max(0, Number(data.booking?.vehicle?.upgradeIsk) || 0)
      if (
        data.booking?.listingId !== listing.id ||
        data.booking?.adminPriceIsk !== listing.fromIsk ||
        (payload.vehicleId && data.booking?.vehicleId !== payload.vehicleId) ||
        data.booking?.amountIskSnapshot !== listing.fromIsk + upgrade
      ) {
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
      setError('Could not confirm checkout. Retry the same details or check your trips before starting another booking.')
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

  const searchCategory = params.get('category') || ''
  const options = useMemo(() => {
    if (!listings || listing) return []
    if (!pickup && !destination) return listings
    return searchListings(listings, { pickup, destination, category: searchCategory })
  }, [listings, listing, pickup, destination, searchCategory])
  const showEnquiry = enquiryOnly || (listings !== null && !listing && options.length === 0 && Boolean(listingId || pickup || destination))
  const showPicker = listings !== null && !listing && !showEnquiry

  async function retryPayment() {
    setPayState('paying'); setError(null)
    try {
      const response = await fetch('/api/payments/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingRef: savedRef }) })
      const data = await response.json()
      if (!response.ok || !data.checkoutUrl) throw new Error(data.message || 'Payment could not start.')
      window.location.assign(data.checkoutUrl)
    } catch (error) { setError(error instanceof Error ? error.message : 'Payment could not start.'); setPayState('default') }
  }
  if (savedRef || (payState === 'confirmed' && confirmation)) {
    const ref = confirmation?.ref || savedRef
    return <main className="mx-auto max-w-xl px-5 py-16 text-heading"><h1 className="text-3xl font-bold">{confirmation ? 'Payment received' : 'Your booking is saved'}</h1><p className="mt-4 font-mono">{ref}</p><p className="mt-2">{confirmation?.statusLabel || savedStatus || 'Your booking remains unpaid until payment is verified.'}</p>{confirmation?.totalLabel && <p className="mt-2 font-bold">{confirmation.totalLabel}</p>}{error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}<div className="mt-6 flex flex-wrap gap-3">{!confirmation && canRetryPayment && <button disabled={payState === 'paying'} onClick={retryPayment} className="rounded-xl bg-primary px-4 py-3 font-bold text-on-primary">{payState === 'paying' ? 'Starting payment…' : 'Retry payment'}</button>}<Link href={user?.role === 'CUSTOMER' ? '/account' : '/manage-booking'} className="rounded-xl border border-line px-4 py-3">Manage booking</Link><a href="/book" className="rounded-xl border border-line px-4 py-3">Book another ride</a></div></main>
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
          initialCustomer={profile}
          luggage={luggage}
          onJourneyChange={change => { const q = new URLSearchParams(params.toString()); for (const [key, value] of Object.entries(change)) q.set(key, String(value)); router.replace(`/book?${q.toString()}`, { scroll: false }) }}
          customerCategory={category === 'RESIDENT' ? 'resident' : 'international'}
          announcements={prefs.announcements}
          listing={listing}
          quoteReady={quoteReady}
          chargedLabel={chargedLabel}
          unavailableMessage={quoteReady ? null : error}
          vehicles={vehicles ?? undefined}
          onVehicleChange={setSelectedVehicle}
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
            currencyTouched.current = true
            setPayCurrency(next === 'ISK' ? 'ISK' : 'EUR')
            prefs.setCurrency(next === 'ISK' ? 'ISK' : 'EUR')
          }}
          onCategoryChange={(next) => { categoryTouched.current = true; setCategory(next === 'resident' ? 'RESIDENT' : 'INTERNATIONAL') }}
          onBack={() => prefs.go('/')}
          onStartEnquiry={() => {
            const q = new URLSearchParams({
              enquiry: '1',
              pickup: listing.fromLabel,
              destination: listing.toLabel,
              date,
              time,
              luggage: String(luggage),
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
            <h1 className="mt-4 font-display text-3xl font-bold text-heading">{pickup && destination ? 'Choose a published price' : 'Book a published trip'}</h1>
            {pickup && destination && (
              <p className="mt-2 text-sm text-muted">{pickup} → {destination}. Prices are set by the team, not by kilometre.</p>
            )}
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
                {options.length === 0 ? (
                  <p className="text-sm text-muted">No published price is available yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {options.map((item) => (
                      <li key={`${item.kind}-${item.id}`}>
                        <button
                          onClick={() => {
                            const q = new URLSearchParams({
                              listing: item.id,
                              kind: item.kind,
                              date,
                              time,
                              luggage: String(luggage),
              passengers: String(passengers),
                            })
                            router.push(`/book?${q.toString()}`)
                          }}
                          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-line bg-card px-4 py-4 text-left transition-colors duration-150 hover:border-input-line"
                        >
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{item.title}</span>
                            <span className="mt-1 block font-semibold text-heading">{item.kind === 'route' ? item.fromLabel : item.title}</span>
                            {item.kind === 'route' && <span className="block text-sm text-muted">to {item.toLabel}</span>}
                            <span className="mt-1 block text-xs text-muted">
                              {item.minutes ? `${item.minutes} min` : 'Fixed price'}
                              {item.km ? ` · ${item.km} km shown, not charged` : ''}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block font-display text-lg font-bold text-heading">{formatPrice(item.fromIsk, prefs.currency === 'ISK' ? 'ISK' : 'EUR', item.iskPerEur)}</span>
                            <span className="block text-xs font-semibold text-link">Select</span>
                          </span>
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
