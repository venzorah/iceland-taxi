'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { MessageCircle, Search, Send } from 'lucide-react'

import { MessageAlertControl, useArmMessageSoundOnPointer } from '@/components/alerts/MessageAlerts'
import { CustomerMessages } from '@/components/customer/CustomerMessages'
import { ReadBadge } from '@/components/messages/ReadBadge'
import { rememberAlertAudience } from '@/lib/alerts/client'
import { useLivePolling } from '@/lib/polling/use-live-polling'
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
  const [driverChat, setDriverChat] = useState(false)
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const [waNumber, setWaNumber] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  useArmMessageSoundOnPointer()

  const loadThreads = useCallback(async (signal?: AbortSignal) => {
    try {
      const [response, companyResponse] = await Promise.all([fetch('/api/messages?as=staff', { signal, cache: 'no-store' }), fetch('/api/company', { signal })])
      const [list, company] = await Promise.all([response.json(), companyResponse.json()])
      if (!response.ok || !list.ok) throw new Error(list.message || 'Could not load conversations.')
      if (signal?.aborted) return
      setThreads(list.threads); setActive(current => current || list.threads[0]?.ref || null)
      setWaNumber(company.company?.whatsappE164 || null)
    } catch (error) { if (!signal?.aborted) setErr(error instanceof Error ? error.message : 'Could not load conversations.'); throw error }
  }, [])
  const loadThread = useCallback(async (ref: string, signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(ref)}?as=staff`, { signal, cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.message || 'Could not load messages.')
      if (!signal?.aborted) { setMessages(data.messages); setErr(null) }
    } catch (error) { if (!signal?.aborted) setErr(error instanceof Error ? error.message : 'Could not load messages.'); throw error }
  }, [])
  useEffect(() => { rememberAlertAudience('staff') }, [])
  useLivePolling(loadThreads, true, 30000)
  useEffect(() => { if (focusRef) setActive(focusRef) }, [focusRef])
  useEffect(() => { setMessages([]); setDraft(''); setErr(null) }, [active, driverChat])
  const pollThread = useCallback(async (signal: AbortSignal) => { if (active) await loadThread(active, signal) }, [active, loadThread])
  useLivePolling(pollThread, !!active && !driverChat, 10000)

  const send = async () => {
    if (!active || !draft.trim() || sending) return
    setSending(true)
    try {
      const response = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ bookingRef:active, body:draft.trim(), as:'staff' }) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.message || 'Message was not sent.')
      setDraft(''); await loadThread(active); await loadThreads()
    } catch(error) { setErr(error instanceof Error ? error.message : 'Message was not sent.') }
    finally { setSending(false) }
  }

  const thread = threads.find((t) => t.ref === active)
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
        {err && <p role="alert" className="p-4 text-sm text-error">{err}</p>}
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
            <div className="flex gap-2 border-b border-line px-5 py-2"><button onClick={() => setDriverChat(false)} aria-pressed={!driverChat} className="rounded-lg border border-line px-3 py-2 text-sm">Customer</button><button onClick={() => setDriverChat(true)} aria-pressed={driverChat} className="rounded-lg border border-line px-3 py-2 text-sm">Assigned driver</button></div>
            {driverChat ? <CustomerMessages key={thread.ref} trips={[{ ref: thread.ref, routeLabel: 'Driver conversation' }]} audience="staff" driverConversation /> : <>
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
              <button disabled={sending || !draft.trim()} onClick={send} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-on-primary">
                <Send size={16} />
              </button>
            </div>
            </>}
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted">Select a conversation</div>
        )}
      </div>
    </div>
  )
}
