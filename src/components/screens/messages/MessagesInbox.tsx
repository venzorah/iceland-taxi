'use client'
import { useCallback, useEffect, useState } from 'react'
import { CustomerMessages } from '@/components/customer/CustomerMessages'
import { useSiteSession } from '@/components/providers/SessionProvider'
import { MessageAlertControl } from '@/components/alerts/MessageAlerts'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteTabBar } from '@/components/site/SiteTabBar'
import { useLivePolling } from '@/lib/polling/use-live-polling'
import { rememberAlertAudience } from '@/lib/alerts/client'
import type { AnnouncementState } from '@/lib/design/announcements'
import type { Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'
export const args = { theme: 'light', language: 'en', currency: 'EUR', role: 'customer' }
type Props = Partial<typeof args> & { onThemeChange?: (t: 'light' | 'dark') => void; onLanguageChange?: (l: Lang) => void; onCurrencyChange?: (c: Currency) => void; onHome?: () => void; onBook?: () => void; onSignIn?: () => void; onAccount?: () => void; announcements?: AnnouncementState; initialRole?: 'customer' | 'staff' }
export default function MessagesInbox(props: Props) {
  const p = { ...args, ...props }
  const { user, loading: sessionLoading } = useSiteSession()
  const role = user && user.role !== 'CUSTOMER' && user.role !== 'DRIVER' ? 'staff' : 'customer'
  const [trips, setTrips] = useState<{ ref: string; routeLabel: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/messages?as=${role}`, { cache: 'no-store', signal })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) throw new Error(data?.message || 'Could not load conversations.')
      if (signal?.aborted) return
      setTrips(data.threads.map((t: { ref: string; title: string }) => ({ ref: t.ref, routeLabel: t.title }))); setError('')
    } catch (error) { if (!signal?.aborted) setError(error instanceof Error ? error.message : 'Could not load conversations.'); throw error }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [role])
  useEffect(() => { rememberAlertAudience(role) }, [role])
  useLivePolling(load, !sessionLoading && !!user, 30000)
  return <div className={p.theme === 'dark' ? 'dark' : ''}><div className="min-h-screen bg-surface text-text">
    <SiteHeader theme={p.theme as 'light' | 'dark'} language={p.language as Lang} currency={p.currency as Currency} onThemeChange={p.onThemeChange} onLanguageChange={p.onLanguageChange} onCurrencyChange={p.onCurrencyChange} onHome={p.onHome} onBook={p.onBook} mobileTitle="Messages" onMobileBack={p.onAccount || p.onHome} announcements={p.announcements} />
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6"><h1 className="font-display text-2xl font-bold text-heading">Messages</h1><p className="mt-2 text-sm text-muted">Choose a booking to read or start its conversation.</p><MessageAlertControl className="my-5" />
      {error && <p role="alert" className="mb-4 text-sm text-error">{error}<button onClick={() => { void load().catch(() => {}) }} className="ml-3 underline">Try again</button></p>}
      {loading ? <p className="p-8 text-muted">Loading conversations…</p> : !error || trips.length ? <CustomerMessages trips={trips} audience={role} /> : null}
    </main>{role === 'customer' && <SiteTabBar language={p.language as Lang} active="help" onHome={p.onHome} onBook={p.onBook} onTrips={p.onAccount} />}
  </div></div>
}
