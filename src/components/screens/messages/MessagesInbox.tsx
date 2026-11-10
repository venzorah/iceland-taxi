'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, MessageCircle, Search, Send } from 'lucide-react'

import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteTabBar } from '@/components/site/SiteTabBar'
import type { AnnouncementState } from '@/lib/design/announcements'
import type { Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'
import { bookingWhatsAppText, whatsappHref } from '@/lib/whatsapp'

export const args = {
  theme: 'light',
  language: 'en',
  currency: 'EUR',
  role: 'customer',
}

type Props = Partial<typeof args> & {
  onThemeChange?: (t: 'light' | 'dark') => void
  onLanguageChange?: (l: Lang) => void
  onCurrencyChange?: (c: Currency) => void
  onHome?: () => void
  onBook?: () => void
  onSignIn?: () => void
  onAccount?: () => void
  announcements?: AnnouncementState
  initialRole?: 'customer' | 'staff'
}

type Thread = {
  id: string
  ref: string
  title: string
  customer: string
  preview: string
  time: string
  unread: number
  who: string
}

type Msg = { id: string; body: string; authorRole: string; time: string; authorName: string }

export default function MessagesInbox(props: Props) {
  const p = { ...args, ...props }
  const th = p.theme as 'light' | 'dark'
  const [role, setRole] = useState<'customer' | 'staff'>(props.initialRole || (p.role as 'customer' | 'staff') || 'customer')
  const [threads, setThreads] = useState<Thread[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [guestEmail, setGuestEmail] = useState('emma@example.local')
  const [waNumber, setWaNumber] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const thread = threads.find((t) => t.ref === active || t.id === active)

  const ensureSession = useCallback(async (r: 'customer' | 'staff') => {
    if (r === 'staff') {
      await fetch('/api/auth/demo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'staff' }) })
    } else {
      await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'guest', email: guestEmail }),
      })
    }
  }, [guestEmail])

  const loadThreads = useCallback(async () => {
    await ensureSession(role)
    const res = await fetch(`/api/messages?as=${role === 'staff' ? 'staff' : 'customer'}`)
    const data = await res.json()
    setThreads(data.threads || [])
    setNote(data.note || null)
  }, [ensureSession, role])

  const loadThread = useCallback(async (ref: string) => {
    await ensureSession(role)
    const res = await fetch(`/api/messages/${ref}`)
    const data = await res.json()
    if (!res.ok || !data.ok) {
      setMessages([])
      setNote(data.message || 'Could not load thread')
      return
    }
    setMessages(data.messages || [])
    setNote(null)
  }, [ensureSession, role])

  useEffect(() => {
    loadThreads()
    fetch('/api/company')
      .then((r) => r.json())
      .then((d) => setWaNumber(d.company?.whatsappE164 || null))
      .catch(() => {})
  }, [loadThreads])

  useEffect(() => {
    if (!active) return
    loadThread(active)
    const t = setInterval(() => loadThread(active), 4000)
    return () => clearInterval(t)
  }, [active, loadThread])

  const send = async () => {
    if (!active || !draft.trim()) return
    await ensureSession(role)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        bookingRef: active,
        body: draft.trim(),
        as: role === 'staff' ? 'staff' : 'customer',
        guestEmail: role === 'customer' ? guestEmail : undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      setNote(data.message || 'Send failed')
      return
    }
    setDraft('')
    await loadThread(active)
    await loadThreads()
  }

  const filtered = threads.filter(
    (t) => !q || t.title.toLowerCase().includes(q.toLowerCase()) || t.customer.toLowerCase().includes(q.toLowerCase()) || t.ref.toLowerCase().includes(q.toLowerCase()),
  )
  const isStaff = role === 'staff'
  const waText = thread ? bookingWhatsAppText(thread.ref) : 'Hello Iceland Taxi Booking'

  return (
    <div className={th === 'dark' ? 'dark' : ''}>
      <div className="flex min-h-screen flex-col bg-surface font-sans text-text">
        <SiteHeader
          theme={th}
          language={p.language as Lang}
          currency={p.currency as Currency}
          onThemeChange={p.onThemeChange}
          onLanguageChange={p.onLanguageChange}
          onCurrencyChange={p.onCurrencyChange}
          onHome={p.onHome}
          onBook={p.onBook}
          onSignIn={p.onSignIn}
          mobileTitle={thread ? thread.title.split('·')[0].trim() : 'Messages'}
          onMobileBack={thread ? () => setActive(null) : p.onAccount || p.onHome}
          announcements={p.announcements}
        />

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-0 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:px-6 md:pb-8 lg:px-8 lg:py-8">
          <div className="hidden items-end justify-between gap-4 px-1 md:flex">
            <div>
              <h1 className="font-display text-2xl font-bold text-heading">{isStaff ? 'Staff inbox' : 'Messages'}</h1>
              <p className="text-sm text-muted">{isStaff ? 'Booking threads assigned to operations and support' : 'Conversations linked to your bookings and quotations'}</p>
              {note && <p className="mt-1 text-xs text-muted">{note}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-line p-0.5 text-xs font-semibold">
                <button onClick={() => { setRole('customer'); setActive(null) }} className={`rounded-full px-3 py-1.5 ${!isStaff ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted'}`}>Customer</button>
                <button onClick={() => { setRole('staff'); setActive(null) }} className={`rounded-full px-3 py-1.5 ${isStaff ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted'}`}>Staff</button>
              </div>
              {!isStaff && (
                <input
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  onBlur={() => loadThreads()}
                  placeholder="Guest email"
                  className="rounded-full border border-input-line bg-input px-3 py-2 text-xs text-heading"
                />
              )}
              <a href={whatsappHref({ e164: waNumber, text: waText })} className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2.5 text-sm font-bold text-navy">
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>
          </div>
          {!waNumber && (
            <p className="mt-2 hidden px-1 text-xs text-muted md:block">Company WhatsApp number is unset in CMS, deep link opens WhatsApp with prefilled text only (no invented number).</p>
          )}

          <div className="mt-0 grid min-h-[560px] flex-1 overflow-hidden border-line bg-bg md:mt-6 md:grid-cols-[340px_1fr] md:rounded-2xl md:border">
            <div className={`${active ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-line md:border-r`}>
              <div className="border-b border-line p-3 md:p-4">
                <div className="flex items-center gap-2 rounded-full border border-input-line bg-input px-3 py-2.5">
                  <Search size={16} className="text-muted" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bookings…" className="w-full bg-transparent text-sm text-heading outline-none placeholder:text-muted" />
                </div>
                <div className="mt-3 flex gap-2 md:hidden">
                  <button onClick={() => { setRole('customer'); setActive(null) }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!isStaff ? 'bg-navy text-white' : 'border border-line text-muted'}`}>Customer</button>
                  <button onClick={() => { setRole('staff'); setActive(null) }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isStaff ? 'bg-navy text-white' : 'border border-line text-muted'}`}>Staff</button>
                </div>
              </div>
              <ul className="flex-1 overflow-y-auto">
                {filtered.map((t) => (
                  <li key={t.ref}>
                    <button
                      onClick={() => setActive(t.ref)}
                      className={`flex w-full gap-3 border-b border-line px-4 py-4 text-left transition-colors ${active === t.ref ? 'bg-surface' : 'hover:bg-surface/70'}`}
                    >
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white dark:bg-primary dark:text-navy">
                        {(t.who || t.customer).slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-heading">{t.title}</p>
                          <span className="shrink-0 text-[11px] text-muted">{t.time}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted">{t.preview}</p>
                      </div>
                      {t.unread > 0 && <span className="mt-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-on-primary">{t.unread}</span>}
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">No conversations yet.</li>}
              </ul>
            </div>

            <div className={`${active ? 'flex' : 'hidden md:flex'} min-h-0 flex-col`}>
              {thread ? (
                <>
                  <div className="flex items-center gap-2 border-b border-line px-3 py-3 md:px-5">
                    <button onClick={() => setActive(null)} className="grid h-9 w-9 place-items-center rounded-full text-heading md:hidden" aria-label="Back">
                      <ChevronLeft size={22} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold text-heading">{thread.title}</p>
                      <p className="text-xs text-muted">Usually replies within minutes · {thread.who}</p>
                    </div>
                    <a href={whatsappHref({ e164: waNumber, text: bookingWhatsAppText(thread.ref) })} aria-label="WhatsApp" className="grid h-9 w-9 place-items-center rounded-full bg-mint text-navy">
                      <MessageCircle size={17} />
                    </a>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto bg-surface p-4 md:p-5">
                    {messages.map((m) => {
                      const mine = isStaff ? m.authorRole === 'staff' : m.authorRole === 'customer'
                      return (
                        <div
                          key={m.id}
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'ml-auto rounded-br-sm bg-navy text-white dark:bg-primary dark:text-navy' : 'rounded-bl-sm bg-bg text-heading'}`}
                        >
                          {m.body}
                          <p className={`mt-1 text-[10px] ${mine ? 'opacity-70' : 'text-muted'}`}>{m.time}{!mine ? ` · ${m.authorName}` : ''}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-2 border-t border-line bg-bg p-3">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && send()}
                      placeholder="Write a message…"
                      className="flex-1 rounded-full border border-input-line bg-input px-4 py-2.5 text-sm text-heading outline-none placeholder:text-muted focus:border-focus"
                    />
                    <button onClick={send} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-on-primary">
                      <Send size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="grid flex-1 place-items-center p-8 text-center">
                  <div>
                    <MessageCircle className="mx-auto text-muted" size={36} />
                    <p className="mt-3 font-display text-lg font-bold text-heading">Select a conversation</p>
                    <p className="mt-1 text-sm text-muted">Booking threads appear here for customers and staff.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      {!isStaff && <SiteTabBar language={p.language as Lang} active="help" onHome={p.onHome} onBook={p.onBook} onTrips={p.onAccount} onHelp={() => setActive(null)} />}
    </div>
  )
}
