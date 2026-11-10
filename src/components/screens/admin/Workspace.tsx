'use client'

import React, { useEffect, useState } from 'react'

type Workspace = {
  source: string
  destinations: { name: string; note: string | null; imageUrl: string | null; active: boolean }[]
  customers: { name: string; email: string; phone: string | null; category: string; bookings: number; currency: string }[]
  reports: {
    bookings: number
    byStatus: { status: string; count: number }[]
    byCurrency: { currency: string; count: number; amount: number; label: string }[]
  }
  reviews: { testimonialsEnabled: boolean; items: unknown[] }
  pages: { title: string; href: string; kind: string; published: boolean }[]
  languages: { code: string; name: string; default: boolean }[]
  integrations: { key: string; label: string; configured: boolean; message: string }[]
  whatsapp?: { enabled: boolean; mode: string; number: string | null; note: string }
  settings: {
    company: {
      displayName: string
      email: string | null
      phone: string | null
      whatsappE164: string | null
      addressLine1: string | null
      city: string | null
      registrationNumber: string | null
      vatNumber: string | null
      aboutEn: string | null
    }
  }
}

function useWorkspace() {
  const [data, setData] = useState<Workspace | null>(null)
  const [message, setMessage] = useState('Loading…')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/workspace')
        const body = await res.json()
        if (cancelled) return
        if (!res.ok || !body.ok) {
          setMessage(body.message || 'Could not load this section')
          return
        }
        setData(body)
        setMessage(body.source === 'database' ? 'Live database' : 'Seed content')
      } catch {
        if (!cancelled) setMessage('Could not load this section')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, message }
}

function Shell({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1100px] p-3 sm:p-6">
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-line bg-bg px-4 py-10 text-center text-sm leading-relaxed text-muted">{children}</p>
}

export function DestinationsSection() {
  const { data, message } = useWorkspace()
  const rows = data?.destinations ?? []
  return (
    <Shell message={message}>
      {rows.length === 0 ? <Empty>No destinations are published yet.</Empty> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((item) => (
            <li key={item.name} className="flex gap-3 overflow-hidden rounded-xl border border-line bg-bg p-3">
              {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover" /> : null}
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-heading">{item.name}</p>
                <p className="mt-1 text-sm leading-snug text-muted">{item.note || 'No note yet'}</p>
                <p className={`mt-2 text-xs font-semibold ${item.active ? 'text-success' : 'text-muted'}`}>{item.active ? 'Shown on the public site' : 'Hidden'}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}

export function CustomersSection() {
  const { data, message } = useWorkspace()
  const rows = data?.customers ?? []
  return (
    <Shell message={message}>
      {rows.length === 0 ? <Empty>No customer accounts or guest bookings yet.</Empty> : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg">
          {rows.map((row) => (
            <li key={row.email} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-heading">{row.name}</p>
                <p className="text-xs font-semibold text-muted">{row.bookings} booking{row.bookings === 1 ? '' : 's'}</p>
              </div>
              <p className="mt-0.5 break-all text-sm text-muted">{row.email}</p>
              <p className="mt-1 text-xs text-muted">{row.category === 'RESIDENT' ? 'Resident' : 'International'} · prefers {row.currency}{row.phone ? ` · ${row.phone}` : ''}</p>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}

export function ReportsSection() {
  const { data, message } = useWorkspace()
  const reports = data?.reports
  return (
    <Shell message={message}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-bg p-4">
          <p className="text-xs font-semibold text-muted">Bookings</p>
          <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-heading">{reports?.bookings ?? '—'}</p>
        </div>
        {(reports?.byCurrency ?? []).map((row) => (
          <div key={row.currency} className="rounded-xl border border-line bg-bg p-4">
            <p className="text-xs font-semibold text-muted">Charged in {row.currency}</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-heading">{row.label}</p>
            <p className="mt-1 text-xs text-muted">{row.count} booking{row.count === 1 ? '' : 's'}</p>
          </div>
        ))}
      </div>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg">
        {(reports?.byStatus ?? []).length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">No booking totals yet.</li>}
        {(reports?.byStatus ?? []).map((row) => (
          <li key={row.status} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="text-heading">{row.status.replace(/_/g, ' ')}</span>
            <span className="font-semibold tabular-nums text-heading">{row.count}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-muted">Totals use the currency stored on each booking. Euro amounts use a dot thousands separator. ISK amounts use the ISK 5,000 format. Historical dollar snapshots stay in dollars.</p>
    </Shell>
  )
}

export function ReviewsSection() {
  const { data, message } = useWorkspace()
  const enabled = data?.reviews.testimonialsEnabled ?? false
  return (
    <Shell message={message}>
      <Empty>
        No approved reviews yet. Reviews are collected only from customers with a completed booking. Testimonials stay {enabled ? 'enabled in settings, but none are published' : 'off'} until real reviews exist. Nothing here is invented.
      </Empty>
    </Shell>
  )
}

export function PagesSection() {
  const { data, message } = useWorkspace()
  const rows = data?.pages ?? []
  return (
    <Shell message={message}>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg">
        {rows.map((row) => (
          <li key={row.kind + row.href + row.title}>
            <a href={row.href} className="flex items-start justify-between gap-3 px-4 py-3 active:bg-surface">
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-snug text-heading">{row.title}</span>
                <span className="mt-0.5 block break-all font-mono text-xs text-muted">{row.href}</span>
              </span>
              <span className="shrink-0 text-right text-xs font-semibold text-muted">
                {row.kind}
                <span className={`mt-1 block ${row.published ? 'text-success' : 'text-muted'}`}>{row.published ? 'Published' : 'Draft'}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

export function LanguagesSection() {
  const { data, message } = useWorkspace()
  return (
    <Shell message={message}>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg">
        {(data?.languages ?? []).map((lang) => (
          <li key={lang.code} className="flex items-center justify-between gap-3 px-4 py-4">
            <div>
              <p className="font-semibold text-heading">{lang.name}</p>
              <p className="text-xs uppercase text-muted">{lang.code}</p>
            </div>
            <p className="text-sm font-semibold text-success">{lang.default ? 'Default' : 'Available'}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-muted">The public site and menus switch between English and Icelandic. Icelandic copy falls back to English when a translation is empty. This list does not add a language by itself.</p>
    </Shell>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-line bg-bg px-4 py-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 break-words text-sm text-heading">{value?.trim() ? value : 'Not set'}</p>
    </div>
  )
}

export function SettingsSection() {
  const { data, message } = useWorkspace()
  const company = data?.settings.company
  const [draft, setDraft] = useState(company?.whatsappE164 || '')
  const [status, setStatus] = useState<string | null>(null)
  const [number, setNumber] = useState<string | null>(company?.whatsappE164 ?? null)

  useEffect(() => {
    setDraft(company?.whatsappE164 || '')
    setNumber(company?.whatsappE164 ?? null)
  }, [company?.whatsappE164])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus(null)
    const res = await fetch('/api/admin/company', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ whatsappE164: draft.trim() || null }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.ok) {
      setStatus(body?.message || 'Could not save the WhatsApp number')
      return
    }
    const saved = body.company?.whatsappE164 || null
    setNumber(saved)
    setDraft(saved || '')
    setStatus(saved ? 'Saved. Customer messages can now notify staff on this WhatsApp number.' : 'Saved. WhatsApp delivery stays off until an official number is stored.')
  }

  return (
    <Shell message={message}>
      <h2 className="font-display text-base font-bold text-heading">Company profile</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">Empty fields stay empty. Phone, address and registration numbers are not filled in here unless they are already stored.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Display name" value={company?.displayName ?? null} />
        <Field label="Email" value={company?.email ?? null} />
        <Field label="Phone" value={company?.phone ?? null} />
        <div className="rounded-xl border border-line bg-bg px-4 py-3 sm:col-span-2">
          <p className="text-xs font-semibold text-muted">Official WhatsApp number</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {!number
              ? 'WhatsApp delivery is off. Add the official company WhatsApp number here. No number is invented, and customer messages are not sent to WhatsApp until one is saved.'
              : data?.integrations?.find((item) => item.key === 'whatsapp')?.configured
                ? 'Outbound WhatsApp notices are sent when a customer messages. Inbound WhatsApp chats are not synced into this inbox.'
                : 'Each new customer message creates a staff notification and a WhatsApp link with the booking reference. The private message is not included. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID on the server to send that notice automatically. Inbound WhatsApp chats are not synced.'}
          </p>
          <form onSubmit={save} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Not set"
              aria-label="Official WhatsApp number"
              inputMode="tel"
              autoComplete="tel"
              className="min-w-0 flex-1 rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted focus:border-focus"
            />
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">Save number</button>
          </form>
          {status && <p className="mt-2 text-xs text-muted">{status}</p>}
        </div>
        <Field label="Address" value={[company?.addressLine1, company?.city].filter(Boolean).join(', ') || null} />
        <Field label="Registration number" value={company?.registrationNumber ?? null} />
        <Field label="VAT number" value={company?.vatNumber ?? null} />
        <Field label="About" value={company?.aboutEn ?? null} />
      </div>
      <h2 className="mt-8 font-display text-base font-bold text-heading">Integrations</h2>
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg">
        {(data?.integrations ?? []).map((item) => (
          <li key={item.key} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-heading">{item.label}</p>
              <p className="mt-0.5 text-sm leading-snug text-muted">{item.message}</p>
            </div>
            <p className={`shrink-0 text-xs font-semibold ${item.configured ? 'text-success' : 'text-muted'}`}>{item.configured ? 'Configured' : 'Not set'}</p>
          </li>
        ))}
      </ul>
    </Shell>
  )
}
