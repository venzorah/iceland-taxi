'use client'
import { notify } from '@/lib/forms/feedback'
import { useNoticeToast } from '@/components/feedback/FormFeedback'

import React, { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Mail, MessageCircle } from 'lucide-react'

import { PublicPageShell } from '@/components/site/PublicPageShell'
import type { Currency } from '@/lib/design/data'
import type { Lang } from '@/lib/design/i18n'
import type { AnnouncementState } from '@/lib/design/announcements'
import {CONTACT_TOPICS} from '@/lib/contact/schema'
import { whatsappHref } from '@/lib/whatsapp'

type Props = {
  theme?: 'light' | 'dark'
  language?: Lang
  currency?: Currency
  state?: 'default' | 'sent'
  onThemeChange?: (t: 'light' | 'dark') => void
  onLanguageChange?: (l: Lang) => void
  onCurrencyChange?: (c: Currency) => void
  onHome?: () => void
  onBook?: () => void
  onSignIn?: () => void
  onStaff?: () => void
  onStaffMobile?: () => void
  onDriver?: () => void
  onAccount?: () => void
  onHelp?: () => void
  announcements?: AnnouncementState
}

export default function Contact(props: Props) {
  const p = { theme: 'light' as const, language: 'en' as Lang, currency: 'EUR' as Currency, state: 'default' as const, ...props }
  const th = p.theme as 'light' | 'dark'
  const [sent, setSent] = useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState(''); useNoticeToast(error, 'error')
  const requestKey=useRef('')
  const previousBody=useRef('')
  const [company, setCompany] = useState<{ whatsappE164?: string | null; email?: string | null; phone?: string | null; addressLine1?: string | null } | null>(null)

  useEffect(() => {
    fetch('/api/company')
      .then((r) => r.json())
      .then((d) => setCompany(d.company || null))
      .catch(() => {})
  }, [])

  return (
    <PublicPageShell
      theme={th}
      language={p.language as Lang}
      currency={p.currency as Currency}
      mobileTitle="Contact"
      onThemeChange={p.onThemeChange}
      onLanguageChange={p.onLanguageChange}
      onCurrencyChange={p.onCurrencyChange}
      onHome={p.onHome}
      onBook={p.onBook}
      onSignIn={p.onSignIn}
      onStaff={p.onStaff}
      onStaffMobile={p.onStaffMobile}
      onDriver={p.onDriver}
      onAccount={p.onAccount}
      onHelp={p.onHelp}
      announcements={p.announcements}
    >
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-extrabold text-heading sm:text-4xl">Contact</h1>
          <p className="mt-3 text-base text-muted">
            Send our operations team a message about a booking, quotation, driver opportunity or partnership.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
          <form
            className="rounded-2xl border border-line bg-card p-5 sm:p-8"
            onSubmit={async(e) => {
              e.preventDefault(); if(busy)return
              const form=new FormData(e.currentTarget)
              const input={name:String(form.get('name')||''),email:String(form.get('email')||''),bookingRef:String(form.get('bookingRef')||''),topic:String(form.get('topic')||'Other'),body:String(form.get('body')||''),website:String(form.get('website')||'')}
              const serialized=JSON.stringify(input)
              if(!requestKey.current||previousBody.current!==serialized){requestKey.current=crypto.randomUUID();previousBody.current=serialized}
              setBusy(true);setError('')
              try{const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,requestKey:requestKey.current})});const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.message||'Your message could not be saved.');setSent(true); notify('Message received. Our team will reply shortly.', 'success')}catch(error){setError(error instanceof Error?error.message:'Your message could not be saved. Please try again.')}finally{setBusy(false)}
            }}
          >
            {sent ? (
              <div className="flex flex-col items-start gap-3 py-8">
                <CheckCircle2 className="text-mint" size={36} />
                <h2 className="font-display text-xl font-bold text-heading">Message received</h2>
                <p className="text-sm text-muted">Your message has been saved for our operations team to review. For urgent trip-day changes, use WhatsApp or your booking messages.</p>
                <button type="button" onClick={() => setSent(false)} className="mt-2 text-sm font-semibold text-link hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-1">
                    <span className="text-xs font-semibold text-muted">Full name</span>
                    <input name="name" placeholder="Enter your full name" maxLength={100} required className="mt-1 w-full rounded-xl border border-input-line bg-input px-4 py-3 text-heading outline-none focus:border-focus" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-muted">Email</span>
                    <input name="email" placeholder="you@example.com" maxLength={254} type="email" required className="mt-1 w-full rounded-xl border border-input-line bg-input px-4 py-3 text-heading outline-none focus:border-focus" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold text-muted">Booking reference (optional)</span>
                    <input name="bookingRef" maxLength={80} placeholder="ITB-…" className="mt-1 w-full rounded-xl border border-input-line bg-input px-4 py-3 text-heading outline-none focus:border-focus" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold text-muted">Topic</span>
                    <select name="topic" className="mt-1 w-full rounded-xl border border-input-line bg-input px-4 py-3 text-heading outline-none focus:border-focus">
                      {CONTACT_TOPICS.map(topic=><option key={topic}>{topic}</option>)}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold text-muted">Message</span>
                    <textarea name="body" placeholder="How can we help?" minLength={10} maxLength={4000} required rows={5} className="mt-1 w-full rounded-xl border border-input-line bg-input px-4 py-3 text-heading outline-none focus:border-focus" />
                  </label>
                </div>
                <div aria-hidden="true" className="hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
                {error&&<p role="alert" className="mt-4 text-sm text-error">{error}</p>}
                <button disabled={busy} type="submit" className="mt-6 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-on-primary hover:bg-primary-hover sm:w-auto sm:px-8">
                  {busy?'Saving…':'Send message'}
                </button>
              </>
            )}
          </form>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Faster channels</p>
              <a href={whatsappHref({ e164: company?.whatsappE164, text: 'Hello Iceland Taxi Booking, ' })} className="mt-4 flex items-center gap-3 rounded-2xl bg-mint px-4 py-3.5 font-bold text-navy">
                <MessageCircle size={18} /> WhatsApp
              </a>
              {company?.email ? (
                <a href={`mailto:${company.email}`} className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-line bg-bg px-4 py-3.5 text-sm font-semibold text-heading">
                  <Mail size={18} className="text-cyan" /> {company.email}
                </a>
              ) : (
                <button type="button" disabled className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-line bg-bg px-4 py-3.5 text-sm font-semibold text-muted">
                  <Mail size={18} className="text-cyan" /> Email (from Admin settings)
                </button>
              )}
              {(company?.phone || company?.addressLine1) && (
                <div className="mt-4 space-y-1 text-sm text-muted">
                  {company.phone && <p>{company.phone}</p>}
                  {company.addressLine1 && <p>{company.addressLine1}</p>}
                </div>
              )}
              <p className="mt-4 text-xs leading-relaxed text-muted">
                For urgent requests, contact the team directly using the published contact details above.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="font-display text-base font-bold text-heading">Already booked?</p>
              <p className="mt-2 text-sm text-muted">Look up your trip with the booking reference from your confirmation email.</p>
              <a href="/manage-booking" className="mt-4 inline-block text-sm font-bold text-link hover:underline">
                Manage booking
              </a>
            </div>
          </aside>
        </div>
      </section>
    </PublicPageShell>
  )
}
