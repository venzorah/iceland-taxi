'use client'

import React, { useState } from 'react'

/** Seeded demo identities. Emails only; no company phone or address. */
export const DEMO_PORTALS = [
  { role: 'Customer', email: 'emma@example.local', href: '/account', action: 'guest' },
  { role: 'Desktop admin', email: 'admin@example.local', href: '/admin', action: 'staff' },
  { role: 'Mobile admin', email: 'admin@example.local', href: '/m', action: 'staff' },
  { role: 'Driver', email: 'ari.driver@example.local', href: '/driver', action: 'driver' },
] as const

export function DemoPortalButtons({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const dark = tone === 'dark'

  const signIn = async (item: (typeof DEMO_PORTALS)[number]) => {
    setBusy(item.role + item.href)
    setError('')
    const res =
      item.action === 'driver'
        ? await fetch('/api/driver/auth', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: item.email }),
          })
        : await fetch('/api/auth/demo', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(item.action === 'staff' ? { role: 'staff' } : { role: 'guest', email: item.email }),
          })
    const data = await res.json().catch(() => null)
    if (!res.ok || data?.ok === false) {
      setError(data?.message || 'Demo sign-in failed')
      setBusy(null)
      return
    }
    window.location.assign(item.href)
  }

  return (
    <div>
      <p className={`text-xs font-semibold ${dark ? 'text-white/70' : 'text-muted'}`}>Demo sign-in</p>
      <div className="mt-2 grid gap-2">
        {DEMO_PORTALS.map((item) => (
          <button
            key={item.href}
            type="button"
            disabled={!!busy}
            onClick={() => signIn(item)}
            className={`min-h-12 rounded-2xl px-4 py-2.5 text-left text-sm leading-snug disabled:opacity-60 ${
              dark
                ? 'border border-white/20 text-white active:bg-white/10'
                : 'border border-line bg-bg text-heading active:bg-surface'
            }`}
          >
            <span className="block font-bold">{item.role}</span>
            <span className={`block break-all ${dark ? 'text-white/70' : 'text-muted'}`}>{item.email}</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  )
}
