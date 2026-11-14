'use client'

import React, { useEffect, useState } from 'react'
import { startPolling } from '@/lib/polling/scheduler'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'

import { useSiteSession } from '@/components/providers/SessionProvider'

import { messageAlertCopy } from '@/lib/alerts/copy'
import {
  alertsArmed,
  alertsEnabled,
  armMessageSound,
  markAlertsEnabled,
  disablePhoneAlerts,
  playMessageSound,
  registerMessageWorker,
  showPhoneNotification,
  subscribeToPush,
} from '@/lib/alerts/client'

type AlertItem = { id: string; bookingRef: string; href: string }
type Toast = { id: string; bookingRef: string; href: string }

const seen = new Set<string>()
let baselinedViewer: string | null = null

export function MessageAlertControl({ className = '' }: { className?: string }) {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  useEffect(() => {
    const sync = () => setEnabled(alertsEnabled())
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('itb-alert-preference', sync)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('itb-alert-preference', sync) }
  }, [])
  const toggle = async () => {
    if (busy) return
    setBusy(true); setDetail(null)
    try {
      if (enabled) { await disablePhoneAlerts(); setEnabled(false); return }
      // Permission must be requested directly from the user's click.
      const permissionRequest = typeof Notification === 'undefined' ? Promise.resolve(null) : Notification.requestPermission()
      markAlertsEnabled(true); armMessageSound({ audible: true }); setEnabled(true)
      const permission = await permissionRequest
      if (permission !== 'granted') {
        setDetail(permission === 'denied' ? 'Sound is enabled. Phone notifications are blocked; allow them in your browser settings.' : 'Sound is enabled while this page is open. Phone notifications need a supported browser and permission.')
        return
      }
      const push = await subscribeToPush()
      setDetail(push.ok ? 'Sound and background phone notifications are enabled.' : 'Sound and open-page alerts are enabled. Background phone notifications are not available yet.')
    } catch (error) { setDetail(error instanceof Error ? error.message : 'Could not update alerts. Please try again.') }
    finally { setBusy(false) }
  }
  return <div className={className}>
    <div className="inline-flex items-center gap-4 rounded-2xl border border-line bg-bg px-4 py-3">
      <Bell size={18} className="text-heading" /><div><p id="message-alert-label" className="text-sm font-semibold text-heading">Sound & phone alerts</p><p className="text-xs text-muted">{enabled ? 'On · notification permissions apply' : 'Off'}</p></div>
      <button type="button" role="switch" aria-label="Sound and phone alerts" aria-checked={enabled} disabled={busy} onClick={toggle} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 ${enabled ? 'bg-primary' : 'bg-line'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'left-1 translate-x-5' : 'left-1'}`} /></button>
    </div>
    {detail && <p role="status" className="mt-2 max-w-md text-xs text-muted">{detail}</p>}
  </div>
}

export function MessageAlerts() {
  const router = useRouter()
  const { user } = useSiteSession()
  const userId = user?.id
  const audience = user?.role === 'CUSTOMER' ? 'customer' : user?.role === 'DRIVER' ? 'driver' : 'staff'
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    if (!userId) { seen.clear(); baselinedViewer = null; setToasts([]); return }
    if (alertsEnabled() && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      sessionStorage.setItem('itb-alerts-armed', '1')
      void registerMessageWorker()
        .then(() => subscribeToPush())
        .catch(() => {})
    }

    const onSW = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'message-alert-navigate' && typeof data.url === 'string') {
        router.push(data.url)
        return
      }
      if (data.type === 'message-push' && typeof data.id === 'string') {
        if (seen.has(data.id)) return
        seen.add(data.id)
        const href = typeof data.url === 'string' ? data.url : '/messages'
        const bookingRef = typeof data.body === 'string' ? data.body.replace(/^New message on /, '') : ''
        playMessageSound()
        setToasts((current) => [...current, { id: data.id, bookingRef, href }])
      }
    }
    navigator.serviceWorker?.addEventListener('message', onSW)

    const pending: AlertItem[] = []

    const announce = (item: AlertItem, hidden: boolean) => {
      const copy = messageAlertCopy(item.bookingRef, item.href)
      if (hidden && alertsEnabled() && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        void showPhoneNotification({ id: item.id, title: copy.title, body: copy.body, url: copy.url })
        playMessageSound()
        return
      }
      if (hidden) {
        pending.push(item)
        return
      }
      playMessageSound()
      setToasts((current) => [...current.filter((t) => t.id !== item.id), item])
    }

    const flush = () => {
      if (document.hidden) return
      const queued = pending.splice(0, pending.length)
      for (const item of queued) announce(item, false)
    }

    const poll = async (signal: AbortSignal) => {
        const res = await fetch(`/api/messages/alerts?as=${audience}`, { signal, cache: 'no-store' })
        if (res.status === 401 || res.status === 403) return { stop: true }
        if (!res.ok) throw new Error('Alerts unavailable')
        const data = await res.json()
        if (signal.aborted) return
        if (!data.ok) throw new Error('Alerts unavailable')
        const viewer = String(data.viewer || 'none')
        if (viewer === 'none') return
        const items = (data.items || []) as AlertItem[]
        if (baselinedViewer !== viewer) {
          baselinedViewer = viewer
          for (const item of items) seen.add(item.id)
          return
        }
        for (const item of items) {
          if (seen.has(item.id)) continue
          seen.add(item.id)
          announce(item, document.hidden)
        }
    }

    const poller = startPolling(poll, { intervalMs: 15000, active: () => !document.hidden })
    const onVisible = () => { flush(); if (!document.hidden) poller.refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      poller.stop()
      document.removeEventListener('visibilitychange', onVisible)
      navigator.serviceWorker?.removeEventListener('message', onSW)
    }
  }, [router, userId, audience])

  useEffect(() => {
    if (toasts.length === 0) return
    const t = window.setTimeout(() => setToasts((current) => current.slice(1)), 6000)
    return () => window.clearTimeout(t)
  }, [toasts])

  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      {toasts.slice(0, 3).map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => router.push(toast.href)}
          className="pointer-events-auto w-full max-w-md rounded-2xl border border-line bg-navy px-4 py-3 text-left text-white shadow-lg"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">New message</p>
          <p className="text-sm font-bold">New message on {toast.bookingRef}</p>
        </button>
      ))}
    </div>
  )
}

export function useArmMessageSoundOnPointer() {
  useEffect(() => {
    const arm = () => {
      if (!alertsArmed()) armMessageSound()
    }
    window.addEventListener('pointerdown', arm, { once: true })
    return () => window.removeEventListener('pointerdown', arm)
  }, [])
}
