'use client'

import React, { useEffect, useState } from 'react'
import { Bell, MessageCircle } from 'lucide-react'

type Notice = {
  id: string
  bookingRef: string
  notice: string
  whatsappUrl: string | null
  delivery: string
  read: boolean
}

type Feature = { enabled: boolean; mode: string; note: string }

function deliveryLabel(delivery: string) {
  if (delivery === 'sent') return 'Notice sent on WhatsApp'
  if (delivery === 'failed') return 'WhatsApp send failed. Open the link.'
  if (delivery === 'link') return 'Open the WhatsApp link'
  return 'WhatsApp delivery is off'
}

export function StaffNoticeBell({
  onOpenChat,
  onOpenSettings,
}: {
  onOpenChat: (ref: string) => void
  onOpenSettings: () => void
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notice[]>([])
  const [unread, setUnread] = useState(0)
  const [feature, setFeature] = useState<Feature | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {

      const data = await fetch('/api/admin/notifications').then((r) => r.json()).catch(() => null)
      if (!alive || !data?.ok) return
      setItems(data.items || [])
      setUnread(data.unread || 0)
      setFeature(data.feature || null)
    }
    load()
    const timer = setInterval(load, 10000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-10 w-10 place-items-center rounded-lg text-heading transition-colors duration-150 hover:bg-surface sm:h-9 sm:w-9"
      >
        <Bell size={17} />
        {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-line bg-bg shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-heading">Customer messages</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {feature?.note || 'WhatsApp delivery follows the company number in System settings.'}
            </p>
          </div>
          {!feature?.enabled && (
            <div className="px-4 py-3">
              <button type="button" onClick={() => { setOpen(false); onOpenSettings() }} className="text-sm font-semibold text-link">
                Add the official WhatsApp number
              </button>
            </div>
          )}
          <ul className="max-h-80 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="border-t border-line px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs text-heading">{item.bookingRef}</p>
                  <span className={`text-[10px] font-bold uppercase ${item.read ? 'text-muted' : 'text-heading'}`}>{item.read ? 'Read' : 'Unread'}</span>
                </div>
                <p className="mt-1 text-sm leading-snug text-text">{item.notice}</p>
                <p className="mt-1 text-[11px] text-muted">{deliveryLabel(item.delivery)}</p>
                <div className="mt-2 flex gap-3">
                  <button type="button" onClick={() => { setOpen(false); onOpenChat(item.bookingRef) }} className="text-xs font-semibold text-link">
                    Open chat
                  </button>
                  {item.whatsappUrl && (
                    <a href={item.whatsappUrl} className="inline-flex items-center gap-1 text-xs font-semibold text-heading">
                      <MessageCircle size={12} /> WhatsApp
                    </a>
                  )}
                </div>
              </li>
            ))}
            {items.length === 0 && <li className="px-4 py-6 text-sm text-muted">No customer message notices yet.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
