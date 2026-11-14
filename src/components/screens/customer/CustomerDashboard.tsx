'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CustomerProfile } from '@/components/customer/CustomerProfile'
import { TripActions } from '@/components/customer/TripActions'
import { CalendarDays, MessageCircle } from 'lucide-react'
import { MessageAlertControl } from '@/components/alerts/MessageAlerts'
import { PickupTimeForm } from '@/components/booking/PickupTimeForm'
import { CustomerWelcome } from '@/components/customer/CustomerWelcome'
import { CustomerMessages } from '@/components/customer/CustomerMessages'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteTabBar } from '@/components/site/SiteTabBar'
import { useLivePolling } from '@/lib/polling/use-live-polling'
import { rememberAlertAudience } from '@/lib/alerts/client'
import { formatChargedAmount, type Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'
import type { AnnouncementState } from '@/lib/design/announcements'

export const args = { tab: 'upcoming', theme: 'light', language: 'en', currency: 'EUR' }
export const argTypes = { tab: { control: 'radio', options: ['upcoming', 'completed', 'cancelled'] }, theme: { control: 'radio', options: ['light', 'dark'] }, language: { control: 'radio', options: ['en', 'is'] }, currency: { control: 'radio', options: ['EUR', 'ISK'] } }
type Props = Partial<typeof args> & {
  onThemeChange?: (t: 'light' | 'dark') => void; onLanguageChange?: (l: Lang) => void; onCurrencyChange?: (c: Currency) => void
  onHome?: () => void; onBook?: () => void; onMessages?: () => void; announcements?: AnnouncementState
}
type Trip = { paymentStatus: string; paid: boolean; hasReceipt: boolean; amountSnapshot: number; currency: 'USD' | 'EUR' | 'ISK'; ref: string; routeLabel: string; serviceLabel: string; status: string; pickupDate: string; pickupTime: string; pickupLabel: string; canEditPickup: boolean; flightNumber: string | null; vehicleLabel: string | null; passengers: number; driverName: string | null }
const tabs = ['upcoming', 'completed', 'cancelled'] as const
const cancelled = new Set(['CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'])
export default function CustomerDashboard(props: Props) {
  const p = { ...args, ...props }
  const [tab, setTab] = useState(p.tab)
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/account/trips', { cache: 'no-store', signal })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) throw new Error(data?.message || 'Could not load your trips.')
      if (!signal?.aborted) { setTrips(data.trips); setError('') }
    } catch (error) { if (!signal?.aborted) setError(error instanceof Error ? error.message : 'Could not load your trips.'); throw error }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [])
  useEffect(() => { rememberAlertAudience('customer') }, [])
  useLivePolling(load, true, 30000)
  const group = (name: string) => trips.filter(t => name === 'completed' ? t.status === 'COMPLETED' : name === 'cancelled' ? cancelled.has(t.status) : t.status !== 'COMPLETED' && !cancelled.has(t.status))
  const visible = group(tab)
  return <div className={p.theme === 'dark' ? 'dark' : ''}><div className="min-h-screen bg-surface text-text">
    <SiteHeader theme={p.theme as 'light' | 'dark'} language={p.language as Lang} currency={p.currency as Currency} onThemeChange={p.onThemeChange} onLanguageChange={p.onLanguageChange} onCurrencyChange={p.onCurrencyChange} onHome={p.onHome} onBook={p.onBook} mobileTitle="My trips" onMobileBack={p.onHome} announcements={p.announcements} />
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pt-10">
      <div className="flex flex-wrap items-start justify-between gap-5"><CustomerWelcome /><Link href="/book" className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary">Book a ride</Link></div>
      <MessageAlertControl className="mt-5" /><CustomerProfile />
      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1fr_380px]"><section>
        <div role="tablist" aria-label="Trips" className="flex gap-1 rounded-2xl bg-line/60 p-1">{tabs.map(name => <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)} className={`min-h-12 flex-1 rounded-xl px-2 text-sm font-semibold capitalize ${tab === name ? 'bg-bg text-heading shadow-sm' : 'text-muted'}`}>{name} ({group(name).length})</button>)}</div>
        {error && <div role="alert" className="mt-4 rounded-2xl border border-line bg-bg p-4 text-sm text-error">{error}<button onClick={() => { setLoading(true); void load().catch(() => {}) }} className="ml-3 font-semibold underline">Try again</button></div>}
        {loading ? <p className="p-8 text-center text-muted">Loading your trips…</p> : !error && visible.length === 0 ? <div className="mt-4 rounded-2xl border border-line bg-bg px-6 py-14 text-center"><CalendarDays size={36} className="mx-auto text-muted" /><h2 className="mt-4 font-display text-xl font-bold text-heading">No {tab} trips yet</h2><p className="mx-auto mt-2 max-w-sm text-sm text-muted">{tab === 'upcoming' ? 'Your next journey starts here. Book a ride and your trip details will appear here.' : `Your ${tab} trips will appear here when you have them.`}</p><Link href="/book" className="mt-6 inline-block rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary">Book a ride</Link></div> : <div className="mt-4 space-y-4">{visible.map(trip => <article key={trip.ref} className="rounded-2xl border border-line bg-bg p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs text-muted">{trip.ref}</span><span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-heading">{trip.status.replaceAll('_', ' ')}</span></div><h2 className="mt-3 font-display text-xl font-bold text-heading">{trip.routeLabel}</h2><p className="mt-1 text-sm text-muted">{trip.serviceLabel} · {trip.passengers} passenger{trip.passengers === 1 ? '' : 's'}</p><p className="mt-2 text-sm text-heading">{trip.vehicleLabel || 'Vehicle to be confirmed'} · {trip.driverName ? `Driver: ${trip.driverName}` : 'Driver to be assigned'}</p>{trip.flightNumber && <p className="mt-1 text-sm text-muted">Flight {trip.flightNumber}</p>}<p className="mt-3 text-sm font-semibold text-heading">Total: {formatChargedAmount(trip.amountSnapshot, trip.currency)} · {trip.paymentStatus === 'AUTHORIZED' ? 'Payment processing' : trip.paymentStatus === 'REFUNDED' ? 'Refund recorded' : trip.paid ? 'Payment received' : 'Unpaid'}</p><PickupTimeForm bookingRef={trip.ref} date={trip.pickupDate} time={trip.pickupTime} label={trip.pickupLabel} canEdit={trip.canEditPickup} onSaved={() => { void load().catch(() => {}) }} /><Link href={`/messages?ref=${encodeURIComponent(trip.ref)}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-link"><MessageCircle size={16} />Message our team</Link><TripActions trip={trip} onUpdated={() => { void load().catch(() => {}) }} /></article>)}</div>}
      </section><CustomerMessages trips={trips} /></div>
    </main><SiteTabBar language={p.language as Lang} active="trips" onHome={p.onHome} onBook={p.onBook} onTrips={() => setTab('upcoming')} onHelp={p.onMessages} />
  </div></div>
}
