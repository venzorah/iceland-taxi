'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Download, MessageCircle, Pencil, Send, XCircle } from 'lucide-react'

import { MessageAlertControl, useArmMessageSoundOnPointer } from '@/components/alerts/MessageAlerts'
import { rememberAlertAudience } from '@/lib/alerts/client'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteTabBar } from '@/components/site/SiteTabBar'
import { IMG, formatPrice, type Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'
import type { AnnouncementState } from '@/lib/design/announcements'
import { ReadBadge } from '@/components/messages/ReadBadge'
import { bookingWhatsAppText, whatsappHref } from '@/lib/whatsapp'

export const args = {
  tab: 'upcoming',
  theme: 'light',
  language: 'en',
  currency: 'EUR',
}

export const argTypes = {
  tab: { control: 'radio', options: ['upcoming', 'completed', 'cancelled'] },
  theme: { control: 'radio', options: ['light', 'dark'] },
  language: { control: 'radio', options: ['en', 'is'] },
  currency: { control: 'radio', options: ['EUR', 'ISK'] },
}

type Props = Partial<typeof args> & {
  onThemeChange?: (t: 'light' | 'dark') => void
  onLanguageChange?: (l: Lang) => void
  onCurrencyChange?: (c: Currency) => void
  onHome?: () => void
  onBook?: () => void
  onMessages?: () => void
  announcements?: AnnouncementState
}

const TRACK = ['Confirmed', 'Driver Assigned', 'Driver En Route', 'In Progress', 'Completed']
const BOOKING_REF = 'ITB-7K4Q2M'
const GUEST_EMAIL = 'emma@example.local'

const PAST = {
  completed: [
    { ref: 'ITB-1QA9TR', title: 'Golden Circle Private Tour', date: '13 Mar 2025', amount: formatPrice(89900, 'EUR'), img: IMG.goldenCircle },
    { ref: 'ITB-6YH2LD', title: 'Keflavík Airport → Reykjavík', date: '10 Mar 2025', amount: formatPrice(22900, 'EUR'), img: IMG.airport },
  ],
  cancelled: [{ ref: 'ITB-2ZC8RU', title: 'Northern Lights Experience', date: '11 Mar 2025', amount: `Refunded ${formatPrice(59900, 'EUR')}`, img: IMG.northernLights }],
}

type ChatMsg = { id: string; body: string; authorRole: string; time: string; authorName?: string }

const TRIP_TABS = [
  { id: 'upcoming', label: 'Upcoming (1)' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
] as const

export default function CustomerDashboard(props: Props) {
  const p = { ...args, ...props }
  const [tab, setTab] = useState(p.tab)
  const th = p.theme as 'light' | 'dark'
  const step = 1
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [draft, setDraft] = useState('')
  const [waNumber, setWaNumber] = useState<string | null>(null)
  const [readState, setReadState] = useState<'read' | 'unread' | null>(null)
  const [composing, setComposing] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [frame, setFrame] = useState({ top: 0, height: 0 })
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useArmMessageSoundOnPointer()
  const docked = narrow && composing

  const loadChat = useCallback(async () => {
    await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'guest', email: GUEST_EMAIL }),
    })
    const list = await fetch('/api/messages?as=customer').then((r) => r.json()).catch(() => null)
    const mine = list?.threads?.find((thread: { ref: string; readState?: 'read' | 'unread' | null }) => thread.ref === BOOKING_REF)
    if (mine?.readState) setReadState(mine.readState)
    const data = await fetch(`/api/messages/${BOOKING_REF}?as=customer`).then((r) => r.json()).catch(() => null)
    if (data?.ok) {
      setChat(data.messages || [])
      setReadState('read')
    }
  }, [])

  useEffect(() => {
    rememberAlertAudience('customer')
    loadChat()
    const t = setInterval(loadChat, 5000)
    fetch('/api/company')
      .then((r) => r.json())
      .then((d) => setWaNumber(d.company?.whatsappE164 || null))
      .catch(() => {})
    return () => clearInterval(t)
  }, [loadChat])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const sync = () => setNarrow(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const view = window.visualViewport
    if (!view) return
    const sync = () => setFrame({ top: view.offsetTop, height: view.height })
    sync()
    view.addEventListener('resize', sync)
    view.addEventListener('scroll', sync)
    return () => {
      view.removeEventListener('resize', sync)
      view.removeEventListener('scroll', sync)
    }
  }, [])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
  }, [chat, docked])

  useEffect(() => {
    if (docked) inputRef.current?.focus()
  }, [docked])

  const send = async () => {
    if (!draft.trim()) return
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bookingRef: BOOKING_REF, body: draft.trim(), as: 'customer', guestEmail: GUEST_EMAIL }),
    })
    setDraft('')
    await loadChat()
  }

  return (
    <div className={th === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-surface font-sans text-text">
        <SiteHeader theme={th} language={p.language as Lang} currency={p.currency as Currency} onThemeChange={p.onThemeChange} onLanguageChange={p.onLanguageChange} onCurrencyChange={p.onCurrencyChange} onHome={p.onHome} onBook={p.onBook} onSignIn={() => {}} mobileTitle="My trips" onMobileBack={p.onHome} announcements={p.announcements} />

        <main className="mx-auto max-w-7xl px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-8 md:pb-8 lg:px-8 lg:py-12">
          <div className="flex flex-wrap items-end justify-between gap-4 px-1 sm:px-0">
            <div>
              <p className="text-sm text-muted">Welcome back</p>
              <h1 className="font-display text-2xl font-bold text-heading sm:text-3xl">Emma Larsen</h1>
              <MessageAlertControl className="mt-3" />
            </div>
            <div className="hidden gap-2 sm:flex">
              <button className="whitespace-nowrap rounded-full border border-line bg-bg px-4 py-2.5 text-sm font-semibold text-heading">Request a custom trip</button>
              <button onClick={p.onBook} className="whitespace-nowrap rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">Book a ride</button>
            </div>
          </div>

          <div role="tablist" aria-label="Trips" className="mt-5 flex min-w-0 flex-wrap gap-1 rounded-2xl bg-line/60 p-1 sm:mt-8 sm:flex-nowrap sm:rounded-none sm:border-b sm:border-line sm:bg-transparent sm:p-0">
            {TRIP_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`min-h-11 min-w-0 flex-1 basis-[30%] rounded-xl px-2 py-2 text-center text-sm font-semibold leading-snug transition-colors duration-150 sm:-mb-px sm:basis-auto sm:flex-none sm:rounded-none sm:border-b-2 sm:px-4 sm:py-3 ${tab === item.id ? 'bg-bg text-heading shadow-sm sm:border-heading sm:bg-transparent sm:shadow-none' : 'text-muted sm:border-transparent hover:text-heading'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid items-start gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[1fr_380px]">
            {tab === 'upcoming' ? (
              <article className="overflow-hidden rounded-2xl border border-line bg-bg">
                <div className="grid sm:grid-cols-[240px_1fr]">
                  <img src={IMG.airport} alt="" className="h-36 w-full object-cover sm:h-full" />
                  <div className="p-4 sm:p-6">
                    <p className="font-mono text-xs text-muted">ITB-7K4Q2M</p>
                    <h2 className="mt-1 font-display text-xl font-bold text-heading sm:text-2xl">Keflavík Airport → Hotel Borg</h2>
                    <p className="mt-1 text-sm text-muted">Today · 15:30 · Flight FI 615 · Standard Sedan · 2 passengers</p>
                    <div className="mt-6">
                      <ol className="flex gap-1" aria-label="Booking status">
                        {TRACK.map((s, i) => <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-mint' : 'bg-line'}`} />)}
                      </ol>
                      <div className="mt-2 flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
                        <span className="font-semibold text-heading">Driver assigned · Ari Þ.</span>
                        <span className="text-muted">Comfort Sedan · PT-903</span>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-3 items-center gap-2 border-t border-line pt-5 sm:flex sm:flex-wrap">
                      <span className="col-span-3 font-display text-xl font-extrabold text-heading sm:mr-auto">{formatPrice(22900, 'EUR')} <span className="text-xs font-semibold text-success">Paid</span></span>
                      <button className="flex flex-col items-center gap-1 rounded-2xl bg-surface py-3 text-xs font-semibold text-heading active:bg-line sm:inline-flex sm:flex-row sm:gap-1.5 sm:rounded-full sm:border sm:border-line sm:bg-transparent sm:px-3.5 sm:py-2 sm:text-sm"><Pencil size={16} className="sm:h-3.5 sm:w-3.5" /> <span className="whitespace-nowrap"><span className="hidden sm:inline">Request </span>change</span></button>
                      <button className="flex flex-col items-center gap-1 rounded-2xl bg-surface py-3 text-xs font-semibold text-heading active:bg-line sm:inline-flex sm:flex-row sm:gap-1.5 sm:rounded-full sm:border sm:border-line sm:bg-transparent sm:px-3.5 sm:py-2 sm:text-sm"><Download size={16} className="sm:h-3.5 sm:w-3.5" /> Receipt</button>
                      <button className="flex flex-col items-center gap-1 rounded-2xl bg-surface py-3 text-xs font-semibold text-error active:bg-line sm:inline-flex sm:flex-row sm:gap-1.5 sm:rounded-full sm:bg-transparent sm:px-3.5 sm:py-2 sm:text-sm"><XCircle size={16} className="sm:h-3.5 sm:w-3.5" /> Cancel</button>
                    </div>
                  </div>
                </div>
              </article>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-bg">
                {PAST[tab as 'completed' | 'cancelled'].map((b) => (
                  <li key={b.ref} className="flex items-center gap-4 p-4">
                    <img src={b.img} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug text-heading">{b.title}</p>
                      <p className="text-xs text-muted">{b.date} · <span className="font-mono">{b.ref}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-heading">{b.amount}</p>
                      {tab === 'completed' && <button className="text-xs font-semibold text-link hover:underline">Leave a review</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Messages */}
            <aside
              className={docked
                ? 'fixed inset-x-0 z-50 flex min-h-0 flex-col overflow-hidden bg-bg'
                : 'flex h-[min(420px,70dvh)] min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-bg sm:h-[460px]'}
              style={docked ? { top: frame.top, height: frame.height || undefined } : undefined}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-bold text-heading">Messages</h2>
                    <ReadBadge state={readState} />
                  </div>
                  <p className="text-xs leading-snug text-muted">About {BOOKING_REF} · usually replies within minutes</p>
                </div>
                <a href={whatsappHref({ e164: waNumber, text: bookingWhatsAppText(BOOKING_REF) })} aria-label="Open WhatsApp" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-navy"><MessageCircle size={17} /></a>
              </div>
              <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-surface p-4">
                {chat.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.authorRole === 'customer' ? 'ml-auto rounded-br-sm bg-navy text-white dark:bg-primary dark:text-navy' : 'rounded-bl-sm bg-bg text-heading'}`}
                  >
                    {m.body}
                    <p className={`mt-1 text-[10px] ${m.authorRole === 'customer' ? 'opacity-70' : 'text-muted'}`}>
                      {m.time}{m.authorRole === 'staff' ? ` · ${m.authorName || 'Staff'}` : ''}
                    </p>
                  </div>
                ))}
                {chat.length === 0 && <p className="text-sm leading-relaxed text-muted">No messages yet, say hello about your booking.</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2 border-t border-line bg-bg p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onFocus={() => setComposing(true)}
                  onBlur={() => setComposing(false)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Write a message…"
                  enterKeyHint="send"
                  className="min-w-0 flex-1 rounded-full border border-input-line bg-input px-4 py-2.5 text-base text-heading placeholder:text-muted sm:text-sm"
                />
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={send} aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-on-primary"><Send size={16} /></button>
              </div>
            </aside>
          </div>
        </main>
      </div>
      <SiteTabBar hidden={docked} language={p.language as Lang} active="trips" onHome={p.onHome} onBook={p.onBook} onTrips={() => setTab('upcoming')} onHelp={p.onMessages} />
    </div>
  )
}
