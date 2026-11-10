'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { CalendarClock, Home, MessageCircle, Plus, UserRound } from 'lucide-react'

import { AppTabBar } from '@/components/site/AppTabBar'
import { BottomSheet } from '@/components/site/BottomSheet'
import { t, type Lang } from '@/lib/design/i18n'

/** The customer site's bottom tab bar on phones. */
export function SiteTabBar({
  active,
  language = 'en',
  onHome,
  onBook,
  onTrips,
  onHelp,
}: {
  active: 'home' | 'book' | 'trips' | 'help' | 'profile'
  language?: Lang
  onHome?: () => void
  onBook?: () => void
  onTrips?: () => void
  onHelp?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<{ email: string; name: string | null } | null>(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const data = await fetch('/api/auth/demo').then((r) => r.json()).catch(() => null)
    if (data?.guestEmail) setSession({ email: data.guestEmail, name: data.guestName || null })
    else setSession(null)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const signIn = async () => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'guest', email: email.trim() }),
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok || !data?.email) {
      setError(data?.message || 'Could not sign in')
      return
    }
    setSession({ email: data.email, name: data.name || null })
    setEmail('')
  }

  const signOut = async () => {
    setBusy(true)
    await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'logout' }),
    }).catch(() => null)
    setSession(null)
    setBusy(false)
  }

  return (
    <>
      <AppTabBar
        active={open ? 'profile' : active}
        tabs={[
          { id: 'home', label: 'Home', icon: Home, onSelect: onHome },
          { id: 'book', label: 'Book', icon: Plus, onSelect: onBook, primary: true },
          { id: 'trips', label: 'My trips', icon: CalendarClock, onSelect: onTrips },
          { id: 'help', label: 'Messages', icon: MessageCircle, onSelect: onHelp },
          {
            id: 'profile',
            label: t(language, 'profile'),
            icon: UserRound,
            onSelect: () => setOpen(true),
            dot: !!session,
          },
        ]}
      />
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t(language, 'profile')}>
        {session ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t(language, 'signedIn')}</p>
              <p className="mt-1 font-display text-lg font-bold text-heading">{session.name || session.email}</p>
              {session.name && <p className="mt-0.5 truncate text-sm text-muted">{session.email}</p>}
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onTrips?.()
              }}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-navy text-sm font-bold text-white active:bg-navy-2 dark:bg-primary dark:text-on-primary"
            >
              My trips
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={signOut}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-line text-sm font-semibold text-heading active:bg-surface disabled:opacity-60"
            >
              {t(language, 'logOut')}
            </button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              signIn()
            }}
          >
            <p className="text-sm leading-relaxed text-muted">{t(language, 'profileHint')}</p>
            <label className="block">
              <span className="text-xs font-semibold text-muted">{t(language, 'profileEmail')}</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="emma@example.local"
                className="mt-1.5 min-h-12 w-full rounded-2xl border border-input-line bg-input px-4 text-base text-heading outline-none focus:border-focus"
              />
            </label>
            {error && <p className="text-sm font-medium text-error">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-bold text-on-primary active:bg-primary-hover disabled:opacity-60"
            >
              {t(language, 'signIn')}
            </button>
            <p className="text-xs text-muted">Seeded demo: emma@example.local</p>
          </form>
        )}
      </BottomSheet>
    </>
  )
}
