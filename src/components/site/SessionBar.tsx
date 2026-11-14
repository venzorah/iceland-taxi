'use client'
import { useState } from 'react'
export function SessionBar({ email }: { email: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function signOut() {
    setBusy(true)
    try {
      const res = await fetch('/api/auth/signout', { method: 'POST' })
      if (!res.ok) throw new Error('Could not sign out. Please try again.')
      window.location.assign('/login')
    } catch { setError('Could not sign out. Please try again.'); setBusy(false) }
  }
  return <div className="flex flex-wrap items-center justify-end gap-3 border-b border-line bg-bg px-4 py-2 text-xs text-heading">
    <span className="min-w-0 max-w-full break-all">{email}</span><button disabled={busy} onClick={signOut} className="rounded-lg border border-line px-3 py-2 font-semibold disabled:opacity-60">{busy ? 'Signing out…' : 'Sign out'}</button>
    {error && <span role="alert">{error}</span>}
  </div>
}
