'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Download, MessageCircle, Pencil, Send, XCircle } from 'lucide-react'

import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteTabBar } from '@/components/site/SiteTabBar'
import { IMG, formatPrice, type Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'
import type { AnnouncementState } from '@/lib/design/announcements'
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

type ChatMsg = { id: string; body: string; authorRole: string; time: string }

export default function CustomerDashboard(props: Props) {
  const p = { ...args, ...props }
  const [tab, setTab] = useState(p.tab)
  const th = p.theme as 'light' | 'dark'
  const step = 1
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [draft, setDraft] = useState('')
  const [waNumber, setWaNumber] = useState<string | null>(null)

  const loadChat = useCallback(async () => {
    await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'guest', email: GUEST_EMAIL }),
    })
    const data = await fetch(`/api/messages/${BOOKING_REF}`).then((r) => r.json()).catch(() => null)
    if (data?.ok) setChat(data.messages || [])
  }, [])

  useEffect(() => {
    loadChat()
    const t = setInterval(loadChat, 5000)
    fetch('/api/company')
      .then((r) => r.json())
      .then((d) => setWaNumber(d.company?.whatsappE164 || null))
      .catch(() => {})
    return () => clearInterval(t)
  }, [loadChat])

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
            </div>
            <div className="hidden gap-2 sm:flex">
              <button className="whitespace-nowrap rounded-full border border-line bg-bg px-4 py-2.5 text-sm font-semibold text-heading">Request a custom trip</button>
              <button onClick={p.onBook} className="whitespace-nowrap rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">Book a ride</button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-line/60 p-1 sm:mt-8 sm:flex sm:rounded-none sm:border-b sm:border-line sm:bg-transparent sm:p-0">
            {(['upcoming', 'completed', 'cancelled'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-xl py-2.5 text-sm font-semibold capitalize transition-colors duration-150 sm:-mb-px sm:rounded-none sm:border-b-2 sm:px-4 sm:py-3 ${tab === t ? 'bg-bg text-heading shadow-sm sm:border-heading sm:bg-transparent sm:shadow-none' : 'text-muted sm:border-transparent hover:text-heading'}`}>
                {t}{t === 'upcoming' && ' (1)'}
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
                      <div className="mt-2 flex justify-between text-xs">
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
                      <p className="truncate font-semibold text-heading">{b.title}</p>
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
            <aside className="flex h-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-bg sm:h-[460px]">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <h2 className="font-display text-base font-bold text-heading">Messages</h2>
                  <p className="text-xs text-muted">About {BOOKING_REF} · usually replies within minutes</p>
                </div>
                <a href={whatsappHref({ e164: waNumber, text: bookingWhatsAppText(BOOKING_REF) })} aria-label="Open WhatsApp" className="grid h-9 w-9 place-items-center rounded-full bg-mint text-navy"><MessageCircle size={17} /></a>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-surface p-4">
                {chat.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.authorRole === 'customer' ? 'ml-auto rounded-br-sm bg-navy text-white dark:bg-primary dark:text-navy' : 'rounded-bl-sm bg-bg text-heading'}`}
                  >
                    {m.body}
                    <p className={`mt-1 text-[10px] ${m.authorRole === 'customer' ? 'opacity-70' : 'text-muted'}`}>
                      {m.time}{m.authorRole === 'staff' ? ' · Iceland Taxi Booking' : ''}
                    </p>
                  </div>
                ))}
                {chat.length === 0 && <p className="text-sm text-muted">No messages yet — say hello about your booking.</p>}
              </div>
              <div className="flex items-center gap-2 border-t border-line p-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Write a message…"
                  className="flex-1 rounded-full border border-input-line bg-input px-4 py-2.5 text-sm text-heading placeholder:text-muted"
                />
                <button onClick={send} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-on-primary"><Send size={16} /></button>
              </div>
            </aside>
          </div>
        </main>
      </div>
      <SiteTabBar language={p.language as Lang} active="trips" onHome={p.onHome} onBook={p.onBook} onTrips={() => setTab('upcoming')} onHelp={p.onMessages} />
    </div>
  )
}
