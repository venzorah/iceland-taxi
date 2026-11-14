'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Briefcase, History, LogIn, Moon, Navigation, Phone, Plane, StickyNote, Sun, Users, CalendarDays } from 'lucide-react'

import { MessageAlertControl, useArmMessageSoundOnPointer } from '@/components/alerts/MessageAlerts'
import { rememberAlertAudience } from '@/lib/alerts/client'
import { CustomerMessages } from '@/components/customer/CustomerMessages'
import { useLivePolling } from '@/lib/polling/use-live-polling'
import { LOGO_DARK, LOGO_LIGHT } from '@/lib/design/data'

export const viewport = 'mobile'

export const args = {
  tab: 'today',
  theme: 'dark',
}

export const argTypes = {
  tab: { control: 'radio', options: ['today', 'history'] },
  theme: { control: 'radio', options: ['light', 'dark'] },
}

type Props = Partial<typeof args> & { onThemeChange?: (t: 'light' | 'dark') => void; onViewSite?: () => void }

type DriverJob = {
  ref: string
  pickupAt: string | null
  customer: string
  phone: string | null
  service: string
  route: string
  pickup: string
  dropoff: string
  pickupAddress?: string | null
  mapUrl?: string | null
  time: string
  dateLabel: string
  pax: number
  bags: number
  flight: string | null
  vehicle: string
  plate: string | null
  notes: string | null
  status: string
  statusLabel: string
  nextAction: string | null
}

type DriverInfo = {
  id: string
  displayName: string
  status: string
  email: string
  phone?: string | null
  vehicle?: { name: string; plate: string | null } | null
}

const FLOW = ['Driver Assigned', 'Acknowledged', 'Driver En Route', 'In Progress', 'Completed'] as const

export default function DriverPortal(props: Props) {
  const p = { ...args, ...props }
  const [tab, setTab] = useState(p.tab)
  const th = p.theme as 'light' | 'dark'
  const [driver, setDriver] = useState<DriverInfo | null>(null)
  const [jobs, setJobs] = useState<DriverJob[]>([])
  const [history, setHistory] = useState<DriverJob[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useArmMessageSoundOnPointer()

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/driver/me', { signal, cache: 'no-store' })
      const me = await response.json()
      if (!response.ok) throw new Error(me.message || 'Could not load your driver account.')
      if (signal?.aborted) return
      if (!me.authenticated) { setDriver(null); setJobs([]); setHistory([]); setLoadError(''); return }
      const responseJobs = await fetch('/api/driver/bookings', { signal, cache: 'no-store' })
      const list = await responseJobs.json()
      if (!responseJobs.ok || !list.ok) throw new Error(list.message || 'Could not load assigned journeys.')
      if (signal?.aborted) return
      setDriver(me.driver); setJobs(list.active); setHistory(list.history); setLoadError('')
    } catch (error) { if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : 'Could not refresh journeys.'); throw error }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [])
  useLivePolling(load, true, 15000)
  useEffect(() => { if (driver) rememberAlertAudience('driver') }, [driver])

  const login = async () => { window.location.assign('/login?next=/driver') }

  const logout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.assign('/login?next=/driver')
    setDriver(null)
    setJobs([])
    setHistory([])
  }

  const advance = async (job: DriverJob) => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/driver/bookings/${encodeURIComponent(job.ref)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedStatus: job.status }) })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setMsg(data.message || 'Could not update status')
        return
      }
      await load()
    } catch { setMsg('Could not confirm the update. Refresh this journey before retrying.') } finally {
      setBusy(false)
    }
  }

  const primary = useMemo(() => jobs.find(j => j.ref === selected) || jobs.find(j => ['DRIVER_EN_ROUTE', 'IN_PROGRESS'].includes(j.status)) || jobs.find((j) => j.nextAction) || jobs[0] || null, [jobs, selected])
  const later = useMemo(() => jobs.filter((j) => j.ref !== primary?.ref), [jobs, primary])
  const stepIndex = primary ? Math.max(0, FLOW.indexOf(primary.statusLabel as (typeof FLOW)[number])) : -1

  if (!driver) {
    return (
      <div className={th === 'dark' ? 'dark' : ''}>
        <div className="grid min-h-screen place-items-center bg-bg px-4 font-sans text-text">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6">
            <img src={th === 'dark' ? LOGO_DARK : LOGO_LIGHT} alt="Iceland Taxi Booking" className="mx-auto h-14 w-auto" />
            <h1 className="mt-4 text-center font-display text-xl font-bold text-heading">Driver portal</h1>
            <p className="mt-1 text-center text-sm leading-relaxed text-muted">{loading ? 'Loading your driver account…' : loadError || 'Sign in with your registered driver account. Contact operations if your account is not active.'}</p>
            {msg && <p className="mt-2 text-sm text-error">{msg}</p>}
            <button
              disabled={busy || loading}
              onClick={login}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-on-primary disabled:opacity-60"
            >
              <LogIn size={16} /> Sign in
            </button>
            {loadError && <button onClick={() => { void load().catch(() => {}) }} className="mt-3 w-full text-sm text-link">Try again</button>}
            <button onClick={() => p.onThemeChange?.(th === 'dark' ? 'light' : 'dark')} className="mt-4 w-full text-center text-xs font-semibold text-link">
              Toggle theme
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={th === 'dark' ? 'dark' : ''}>
      <div className="relative flex h-screen flex-col overflow-hidden bg-bg font-sans text-text">
        <header className="shrink-0 border-b border-line">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:h-20">
            <img src={th === 'dark' ? LOGO_DARK : LOGO_LIGHT} alt="Iceland Taxi Booking" className="h-12 w-auto lg:h-14" />
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">Driver</span>
            <div className="ml-6 hidden items-center rounded-full border border-line p-0.5 text-sm font-semibold lg:flex" role="tablist">
              {([['today', 'Today', CalendarDays], ['history', 'History', History]] as const).map(([id, label, Icon]) => (
                <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors duration-150 ${tab === id ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted hover:text-heading'}`}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
            <button onClick={() => p.onThemeChange?.(th === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" className="ml-auto grid h-10 w-10 place-items-center rounded-full text-heading">
              {th === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={logout} className="text-xs font-semibold text-muted hover:text-heading">Sign out</button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-10">
          {tab === 'today' ? (
            <div className="mx-auto max-w-xl p-4 sm:p-6 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-x-12 lg:p-8">
              <div>
                <p className="text-sm text-muted">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Atlantic/Reykjavik' })} · {driver.displayName}</p>
                <h1 className="font-display text-2xl font-bold text-heading lg:text-3xl">Next pickup</h1>
                <p className="mt-1 text-sm text-muted">{driver.status} · Times in Iceland</p><MessageAlertControl className="mt-3" /><DriverProfile driver={driver} onSaved={load} />
                {loadError && <p role="alert" className="mt-3 text-sm text-error">{loadError} <button onClick={() => { void load().catch(() => {}) }} className="underline">Refresh</button></p>}
                {msg && <p className="mt-2 text-sm text-error">{msg}</p>}

                {!primary ? (
                  <div className="mt-4 rounded-2xl border border-line bg-surface p-6 text-center">
                    <p className="font-display text-lg font-bold text-heading">No assigned journeys</p>
                    <p className="mt-1 text-sm text-muted">When ops assigns you a booking, it appears here.</p>
                  </div>
                ) : primary.status === 'COMPLETED' ? (
                  <div className="mt-4 rounded-2xl border border-line bg-surface p-6 text-center">
                    <p className="font-display text-lg font-bold text-heading">Journey completed</p>
                    <p className="mt-1 text-sm text-muted">{primary.ref} has been marked complete.</p>
                  </div>
                ) : (
                  <article className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
                    <div className="bg-navy px-5 py-4 text-white">
                      <div className="flex items-baseline justify-between">
                        <p className="font-display text-4xl font-extrabold tabular-nums">{primary.time}</p>
                        <p className="font-mono text-xs text-white/70">{primary.ref}</p>
                      </div>
                      <p className="mt-1 text-sm text-white/80">{primary.dateLabel} · {primary.service} · {primary.vehicle}{primary.plate ? ` · ${primary.plate}` : ''}</p>
                    </div>
                    <div className="space-y-4 p-5">
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center pt-1">
                          <span className="h-2.5 w-2.5 rounded-full bg-mint" />
                          <span className="my-1 w-px flex-1 bg-line" />
                          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        </div>
                        <div className="flex-1 space-y-4">
                          <div>
                            <p className="text-xs text-muted">Pickup</p>
                            <p className="font-semibold text-heading">{primary.pickup}</p>
                            {primary.pickupAddress && primary.mapUrl && (
                              <a href={primary.mapUrl} target="_blank" rel="noreferrer" className="mt-1 block text-sm font-semibold text-link underline">
                                {primary.pickupAddress}
                              </a>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted">Drop-off</p>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(primary.dropoff)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-link underline"
                            >
                              {primary.dropoff}
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-xl bg-bg py-2.5"><Plane size={14} className="mx-auto text-muted" /><p className="mt-1 font-semibold text-heading">{primary.flight || '—'}</p><p className="text-muted">Flight</p></div>
                        <div className="rounded-xl bg-bg py-2.5"><Users size={14} className="mx-auto text-muted" /><p className="mt-1 font-semibold text-heading">{primary.pax} pax</p><p className="text-muted">Passengers</p></div>
                        <div className="rounded-xl bg-bg py-2.5"><Briefcase size={14} className="mx-auto text-muted" /><p className="mt-1 font-semibold text-heading">{primary.bags} bags</p><p className="text-muted">Luggage</p></div>
                      </div>
                      {primary.notes && (
                        <div className="flex items-start gap-3 rounded-xl bg-bg p-3 text-sm">
                          <StickyNote size={16} className="mt-0.5 shrink-0 text-muted" />
                          <p className="text-text">{primary.notes}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-heading">{primary.customer}</p>
                          <p className="text-xs text-muted">{primary.phone || 'No phone on file'}</p>
                        </div>
                        <div className="flex gap-2">
                          {primary.phone ? (
                            <a href={`tel:${primary.phone}`} aria-label="Call customer" className="grid h-11 w-11 place-items-center rounded-full border border-line text-heading"><Phone size={18} /></a>
                          ) : (
                            <span className="grid h-11 w-11 place-items-center rounded-full border border-line text-muted"><Phone size={18} /></span>
                          )}
                          <a
                            href={primary.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(primary.pickup)}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open navigation"
                            className="grid h-11 w-11 place-items-center rounded-full border border-line text-heading"
                          >
                            <Navigation size={18} />
                          </a>
                        </div>
                      </div>

                      <ol className="flex gap-1 pt-1" aria-label="Journey progress">
                        {FLOW.map((s, i) => (
                          <li key={s} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${i <= stepIndex ? 'bg-mint' : 'bg-line'}`} />
                        ))}
                      </ol>
                      <p className="text-xs text-muted">Status: <strong className="text-heading">{primary.statusLabel}</strong></p>
                      {primary.nextAction && (
                        <button
                          disabled={busy}
                          onClick={() => advance(primary)}
                          className="hidden w-full rounded-2xl bg-primary py-4 text-base font-bold text-on-primary transition-transform duration-150 active:scale-[0.98] disabled:opacity-60 lg:block"
                        >
                          {primary.nextAction}
                        </button>
                      )}
                    </div>
                  </article>
                )}
              </div>

              <div className="lg:pt-12">
                <h2 className="mt-8 font-display text-base font-bold text-heading lg:mt-0">Other assigned journeys</h2>
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {later.map((u) => (
                    <li key={u.ref}><button onClick={() => setSelected(u.ref)} className="flex w-full items-center gap-4 py-3.5 text-left">
                      <p className="w-12 font-display font-bold tabular-nums text-heading">{u.time}</p>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-heading">{u.route}</p>
                        <p className="text-xs text-muted">{u.dateLabel} · {u.pax} pax · {u.vehicle} · {u.statusLabel}</p>
                      </div>
                    </button></li>
                  ))}
                  {later.length === 0 && <li className="py-6 text-center text-sm text-muted">No other assigned journeys.</li>}
                </ul>
                <div className="mt-6"><CustomerMessages trips={[...jobs, ...history].map(j => ({ ref: j.ref, routeLabel: j.route }))} audience="driver" driverConversation /></div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-xl p-4 sm:p-6 lg:max-w-3xl lg:p-8">
              <h1 className="font-display text-2xl font-bold text-heading">Journey history</h1>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {history.map((j) => (
                  <li key={j.ref} className="py-3.5">
                    <p className="text-sm font-semibold text-heading">{j.route}</p>
                    <p className="text-xs text-muted">{j.dateLabel} · <span className="font-mono">{j.ref}</span> · {j.statusLabel}</p>
                  </li>
                ))}
                {history.length === 0 && <li className="py-8 text-center text-sm text-muted">No past journeys yet.</li>}
              </ul>
            </div>
          )}
        </main>

        {tab === 'today' && primary?.nextAction && (
          <div className="absolute inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] mx-auto max-w-xl px-4 pb-3 sm:px-6 lg:hidden">
            <button
              disabled={busy}
              onClick={() => advance(primary)}
              className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-on-primary transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
            >
              {primary.nextAction}
            </button>
          </div>
        )}

        <nav className="absolute inset-x-0 bottom-0 grid grid-cols-2 border-t border-line bg-bg pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
          {([['today', 'Today', CalendarDays], ['history', 'History', History]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className="flex flex-col items-center gap-1 py-1">
              <Icon size={21} className={tab === id ? 'text-heading' : 'text-muted'} />
              <span className={`text-[11px] ${tab === id ? 'font-bold text-heading' : 'font-medium text-muted'}`}>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function DriverProfile({ driver, onSaved }: { driver: DriverInfo; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(driver.displayName)
  const [phone, setPhone] = useState(driver.phone || '')
  const [status, setStatus] = useState(driver.status)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => { setStatus(driver.status) }, [driver.status])
  return <details className="mt-4 rounded-xl border border-line bg-surface p-4"><summary className="cursor-pointer text-sm font-semibold text-heading">My account & availability</summary><form className="mt-4 space-y-3" onSubmit={async e => {
    e.preventDefault(); if (saving) return
    setSaving(true); setMessage('')
    try {
      const response = await fetch('/api/driver/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: name, phone, ...(status !== driver.status ? { status } : {}) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not save your account.')
      setMessage('Account saved.'); await onSaved()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save your account.') }
    finally { setSaving(false) }
  }}>
    <p className="break-all text-sm text-muted">{driver.email}</p>
    <label className="block text-sm">Name<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-lg border border-line bg-input p-2 text-heading" /></label>
    <label className="block text-sm">Phone<input type="tel" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full rounded-lg border border-line bg-input p-2 text-heading" /></label>
    <label className="block text-sm">Availability<select value={status} disabled={driver.status === 'On trip'} onChange={e => setStatus(e.target.value)} className="mt-1 block w-full rounded-lg border border-line bg-input p-2 text-heading">{driver.status === 'On trip' && <option>On trip</option>}<option>Available</option><option>Unavailable</option></select></label>
    <p className="text-xs text-muted">Your assigned journeys remain visible when you are unavailable. Contact operations to change an assignment.</p>
    <button disabled={saving} className="rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary disabled:opacity-50">{saving ? 'Saving…' : 'Save account'}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form></details>
}
