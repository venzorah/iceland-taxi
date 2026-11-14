'use client'

import React, { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

import { PickupTimeForm, type SavedPickup } from '@/components/booking/PickupTimeForm'
import { PublicPageShell } from '@/components/site/PublicPageShell'
import type { Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'
import type { AnnouncementState } from '@/lib/design/announcements'

type Props = {
  theme?: 'light' | 'dark'
  language?: Lang
  currency?: Currency
  state?: 'default' | 'found' | 'empty'
  onThemeChange?: (t: 'light' | 'dark') => void
  onLanguageChange?: (l: Lang) => void
  onCurrencyChange?: (c: Currency) => void
  onHome?: () => void
  onBook?: () => void
  onSignIn?: () => void
  onStaff?: () => void
  onStaffMobile?: () => void
  onDriver?: () => void
  onAccount?: () => void
  onHelp?: () => void
  onMessages?: () => void
  announcements?: AnnouncementState
}

type FoundBooking = {
  ref: string
  title: string
  summary: string
  detail: string
  email: string
  pickupDate: string
  pickupTime: string
  pickupLabel: string
  canEditPickup: boolean
}

export default function ManageBooking(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, state: 'default' as const, ...props }
  const th = p.theme as 'light' | 'dark'
  const [ref, setRef] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'default' | 'found' | 'empty' | 'loading'>(p.state)
  const [found, setFound] = useState<FoundBooking | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const signingIn = false

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        const guest = typeof data?.guestEmail === 'string' ? data.guestEmail : null
        setSessionEmail(guest)
        if (guest) setEmail((current) => current || guest)
      })
      .catch(() => {})
  }, [])

  const signedInAsCustomer = Boolean(found && sessionEmail && sessionEmail.toLowerCase() === found.email)

  const signInAsCustomer = async () => { window.location.assign('/login?next=/account') }

  const applySaved = (saved: SavedPickup) => {
    setFound((current) =>
      current && current.ref === saved.ref
        ? { ...current, pickupDate: saved.date, pickupTime: saved.time, pickupLabel: saved.label }
        : current,
    )
  }

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={p.currency as Currency}
      mobileTitle="Manage booking"
      onThemeChange={p.onThemeChange}
      onLanguageChange={p.onLanguageChange}
      onCurrencyChange={p.onCurrencyChange}
      onHome={p.onHome}
      onBook={p.onBook}
      onSignIn={p.onSignIn}
      onStaff={p.onStaff}
      onStaffMobile={p.onStaffMobile}
      onDriver={p.onDriver}
      onAccount={p.onAccount}
      onHelp={p.onHelp}
      announcements={p.announcements}
      activeTab="trips"
    >
      <section className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="font-display text-3xl font-extrabold text-heading">Manage booking</h1>
        <p className="mt-3 text-base text-muted">Enter your booking reference and email. Guests can look up a booking in the browser used at checkout. On another device, sign in with a verified account using the booking email, or contact support.</p>

        <form
          className="mt-8 space-y-4 rounded-2xl border border-line bg-card p-5 sm:p-6"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            setState('loading')
            try {
              const res = await fetch('/api/bookings/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ref: ref.trim(), email: email.trim() }),
              })
              const data = await res.json().catch(() => ({}))
              if (res.ok && data.booking) {
                setFound({
                  ref: data.booking.ref,
                  title: data.booking.routeLabel || data.booking.serviceLabel,
                  summary: data.booking.summary,
                  detail: data.booking.detail || data.booking.summary,
                  email: email.trim().toLowerCase(),
                  pickupDate: data.booking.pickupDate || '',
                  pickupTime: data.booking.pickupTime || '',
                  pickupLabel: data.booking.pickupLabel || 'Schedule to be confirmed',
                  canEditPickup: Boolean(data.booking.canEditPickup),
                })
                setState('found')
              } else {
                setFound(null)
                setState('empty')
              }
            } catch {
              setError('Lookup failed. Try again shortly.')
              setState('empty')
            }
          }}
        >
          <label className="block">
            <span className="text-xs font-semibold text-muted">Booking reference</span>
            <input value={ref} onChange={(e) => setRef(e.target.value)} required placeholder="ITB-…" className="mt-1 w-full rounded-xl border border-input-line bg-input px-4 py-3 font-mono text-heading outline-none focus:border-focus" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted">Email used at checkout</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-xl border border-input-line bg-input px-4 py-3 text-heading outline-none focus:border-focus" />
          </label>
          <button type="submit" disabled={state === 'loading'} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-on-primary hover:bg-primary-hover disabled:opacity-60">
            <Search size={16} /> {state === 'loading' ? 'Searching…' : 'Find booking'}
          </button>
        </form>

        {state === 'found' && found && (
          <article className="mt-6 rounded-2xl border border-line bg-bg p-5">
            <p className="font-mono text-xs text-muted">{found.ref}</p>
            <h2 className="mt-1 font-display text-xl font-bold text-heading">{found.title}</h2>
            <p className="mt-1 text-sm font-semibold text-heading">{found.pickupLabel}</p>
            <p className="mt-1 text-sm text-muted">{found.detail}</p>
            {signedInAsCustomer || !found.canEditPickup ? (
              <PickupTimeForm
                bookingRef={found.ref}
                date={found.pickupDate}
                time={found.pickupTime}
                label={found.pickupLabel}
                canEdit={found.canEditPickup && signedInAsCustomer}
                onSaved={applySaved}
              />
            ) : (
              <button
                type="button"
                onClick={signInAsCustomer}
                disabled={signingIn}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover disabled:opacity-60 sm:w-auto"
              >
                {signingIn ? 'Signing in…' : 'Sign in to change pickup'}
              </button>
            )}
            {error && state === 'found' && (
              <p role="alert" className="mt-3 text-sm text-error">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={p.onAccount} className="rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white dark:bg-primary dark:text-navy">Open trip</button>
              <button onClick={p.onMessages} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-heading">Message team</button>
            </div>
          </article>
        )}
        {state === 'empty' && (
          <p className="mt-6 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted" role="alert">
            {error || 'No accessible booking matched. Check the reference and email, use your checkout browser, or sign in with the booking email. Contact support if you still need help.'}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          Have an account?{' '}
          <button onClick={p.onSignIn} className="font-semibold text-link hover:underline">
            Sign in to My trips
          </button>
        </p>
      </section>
    </PublicPageShell>
  )
}
