'use client'

import React, { useState } from 'react'
import { CalendarClock, Home, MessageCircle, Plus, UserRound } from 'lucide-react'

import Link from 'next/link'
import { useSiteSession } from '@/components/providers/SessionProvider'

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
  hidden = false,
}: {
  active: 'home' | 'book' | 'trips' | 'help' | 'profile'
  language?: Lang
  onHome?: () => void
  onBook?: () => void
  onTrips?: () => void
  onHelp?: () => void
  /** Hide the bar while a mobile composer is open so it cannot cover the input. */
  hidden?: boolean
}) {
  const [open, setOpen] = useState(false)
  const { user: session, loading, accountHref, signOut: endSession } = useSiteSession()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const signOut = async () => {
    setBusy(true); setError('')
    try { await endSession() }
    catch { setError('Could not sign out. Please try again.'); setBusy(false) }
  }

  return (
    <>
      <AppTabBar
        hidden={hidden}
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
        {loading ? <p className="text-sm text-muted">Loading account…</p> : <>
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
                window.location.assign(accountHref)
              }}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-navy text-sm font-bold text-white active:bg-navy-2 dark:bg-primary dark:text-on-primary"
            >
              {session.role === 'CUSTOMER' ? 'My trips' : 'My account'}
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
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted">Sign in to manage your account and trips.</p>
            <Link href="/login" className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-bold text-on-primary">{t(language, 'signIn')}</Link>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
        </>}
      </BottomSheet>
    </>
  )
}
