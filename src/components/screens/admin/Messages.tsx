'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { MessageCircle, Search, Send } from 'lucide-react'

import { MessageAlertControl, useArmMessageSoundOnPointer } from '@/components/alerts/MessageAlerts'
import { ReadBadge } from '@/components/messages/ReadBadge'
import { rememberAlertAudience } from '@/lib/alerts/client'
import { markThreadOpen } from '@/lib/messaging/read-state'
import { staffMessageNotice, whatsappHref } from '@/lib/whatsapp'

type Thread = {
  id: string
  ref: string
  customer: string
  preview: string
  time: string
  unread: number
  readState?: 'read' | 'unread' | null
}

type Props = {
  focusRef?: string | null
  onOpenSettings?: () => void
}

type Msg = { id: string; body: string; authorRole: string; time: string }

export function Messages({ focusRef, onOpenSettings }: Props) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const [waNumber, setWaNumber] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [openRef, setOpenRef] = useState<string | null>(null)
  useArmMessageSoundOnPointer()

  const loadThreads = useCallback(async () => {
    await fetch('/api/auth/demo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'staff' }) })
    const [list, company] = await Promise.all([
      fetch('/api/messages?as=staff').then((r) => r.json()),
      fetch('/api/company').then((r) => r.json()),
    ])
    setThreads(markThreadOpen(list.threads || [], openRef))
    setWaNumber(company.company?.whatsappE164 || null)
  }, [openRef])

  const loadThread = useCallback(async (ref: string) => {
    await fetch('/api/auth/demo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'staff' }) })
    const data = await fetch(`/api/messages/${ref}?as=staff`).then((r) => r.json())
    if (!data.ok) {
      setErr(data.message || 'Failed to load')
      setOpenRef(null)
      return
    }
    setMessages(data.messages || [])
    setOpenRef(ref)
    setThreads((prev) => markThreadOpen(prev, ref))
    setErr(null)
  }, [])

  useEffect(() => {
    rememberAlertAudience('staff')
    loadThreads()
    const timer = setInterval(loadThreads, 8000)
    return () => clearInterval(timer)
  }, [loadThreads])

  useEffect(() => {
    if (focusRef) setActive(focusRef)
  }, [focusRef])

  useEffect(() => {
    if (!active) return
    loadThread(active)
    const t = setInterval(() => loadThread(active), 4000)
    return () => clearInterval(t)
  }, [active, loadThread])

  const send = async () => {
    if (!active || !draft.trim()) return
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bookingRef: active, body: draft.trim(), as: 'staff' }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      setErr(data.message || 'Send failed')
      return
    }
    setDraft('')
    await loadThread(active)
    await loadThreads()
  }

  const thread = threads.find((t) => t.ref === active) || threads[0]
  const filtered = threads.filter(
    (t) => !q || t.customer.toLowerCase().includes(q.toLowerCase()) || t.ref.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div className="grid min-h-0 lg:h-full lg:grid-cols-[360px_1fr]">
      <div className="min-h-0 border-b border-line bg-bg lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="border-b border-line p-4">
          <div className="flex items-center gap-2 rounded-lg border border-input-line bg-input px-3 py-2">
            <Search size={15} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
          </div>
          <MessageAlertControl className="mt-3" />
          {err && <p className="mt-2 text-xs text-error">{err}</p>}
        </div>
        <ul>
          {filtered.map((t) => (
            <li key={t.ref}>
              <button
                onClick={() => setActive(t.ref)}
                className={`flex w-full gap-3 border-b border-line px-4 py-3.5 text-left ${active === t.ref ? 'bg-surface' : 'hover:bg-surface/60'}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-heading">{t.customer}</p>
                    <span className="text-[11px] text-muted">{t.time}</span>
                  </div>
                  <p className="font-mono text-[11px] text-muted">{t.ref}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{t.preview}</p>
                </div>
                <ReadBadge state={t.readState} />
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">No booking threads yet.</li>}
        </ul>
      </div>

      <div className="flex min-h-[420px] flex-col bg-bg lg:min-h-0">
        {thread ? (
          <>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="font-display text-base font-bold text-heading">{thread.customer}</p>
                <p className="font-mono text-xs text-muted">{thread.ref}</p>
              </div>
              {waNumber ? (
                <a href={whatsappHref({ e164: waNumber, text: staffMessageNotice(thread.ref) })} className="inline-flex items-center gap-1.5 rounded-lg bg-mint px-3 py-2 text-xs font-bold text-navy">
                  <MessageCircle size={14} /> WhatsApp
                </a>
              ) : (
                <button type="button" onClick={onOpenSettings} className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-heading">
                  Add WhatsApp number
                </button>
              )}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-surface p-5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${m.authorRole === 'staff' ? 'ml-auto rounded-br-sm bg-navy text-white dark:bg-primary dark:text-navy' : 'rounded-bl-sm bg-card text-heading'}`}
                >
                  {m.body}
                  <p className={`mt-1 text-[10px] ${m.authorRole === 'staff' ? 'opacity-70' : 'text-muted'}`}>
                    {m.time}{m.authorRole === 'staff' ? ' · You' : ''}
                  </p>
                </div>
              ))}
              {messages.length === 0 && <p className="text-sm text-muted">No messages in this thread yet, send the first reply.</p>}
            </div>
            <div className="flex items-center gap-2 border-t border-line p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Reply…"
                className="flex-1 rounded-lg border border-input-line bg-input px-3 py-2.5 text-sm outline-none focus:border-focus"
              />
              <button onClick={send} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-on-primary">
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted">Select a conversation</div>
        )}
      </div>
    </div>
  )
}
