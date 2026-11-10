'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'

import { messageAlertCopy } from '@/lib/alerts/copy'
import {
  alertAudience,
  alertsArmed,
  alertsEnabled,
  armMessageSound,
  markAlertsEnabled,
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
  const [label, setLabel] = useState('Turn on sound and phone alerts')
  const [detail, setDetail] = useState<string | null>(null)

  useEffect(() => {
    if (alertsEnabled() && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      setLabel('Phone alerts are on')
    }
  }, [])

  const enable = async () => {
    armMessageSound({ audible: true })
    markAlertsEnabled()
    if (typeof Notification === 'undefined') {
      setLabel('Sound is on')
      setDetail('This browser cannot show phone notifications. Sound still plays while the site is open.')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setLabel('Sound is on')
      setDetail('Notifications are blocked, so nothing can appear at the top of the phone. Sound still plays while you are in the app.')
      return
    }
    try {
      await registerMessageWorker()
      const push = await subscribeToPush()
      setLabel('Phone alerts are on')
      setDetail(
        push.ok
          ? 'You will get a sound in the app and a notification at the top of the phone.'
          : `${push.reason} Sound and notifications still work while this site is open.`,
      )
    } catch {
      setLabel('Sound is on')
      setDetail('Could not register background alerts. Sound and notifications still work while this site is open.')
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={enable}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-3 py-2 text-xs font-semibold text-heading"
      >
        <Bell size={14} /> {label}
      </button>
      {detail && <p className="mt-1 max-w-sm text-[11px] text-muted">{detail}</p>}
    </div>
  )
}

export function MessageAlerts() {
  const router = useRouter()
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
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

    let timer = 0
    const pending: AlertItem[] = []

    const announce = (item: AlertItem, hidden: boolean) => {
      const copy = messageAlertCopy(item.bookingRef, item.href)
      if (hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
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

    const poll = async () => {
      try {
        const as = alertAudience()
        const res = await fetch(as ? `/api/messages/alerts?as=${as}` : '/api/messages/alerts')
        const data = await res.json()
        if (!res.ok || !data.ok) return
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
      } catch {
        /* keep polling */
      }
    }

    const onVisible = () => flush()
    document.addEventListener('visibilitychange', onVisible)
    void poll()
    timer = window.setInterval(poll, 5000)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      navigator.serviceWorker?.removeEventListener('message', onSW)
    }
  }, [router])

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
