'use client'

import { useEffect, useRef, useState } from 'react'
import { LogOut, UserRound, X } from 'lucide-react'
import { endSession } from '@/lib/auth/sign-out'

export function DriverProfileMenu({ name, email }: { name: string; email: string }) {
  const menu = useRef<HTMLDetailsElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && menu.current?.open) { menu.current.open = false; menu.current.querySelector('summary')?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [])
  return <details ref={menu} className="relative z-50 shrink-0">
    <summary aria-label="Driver profile" className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full border border-line bg-surface text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><UserRound size={20} /></summary>
    <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-bg p-3 shadow-xl">
      <div className="flex items-start gap-2"><p className="min-w-0 flex-1 break-words px-2 pt-1 text-sm font-bold text-heading">{name}</p><button type="button" aria-label="Close profile menu" onClick={() => { if (menu.current) { menu.current.open = false; menu.current.querySelector('summary')?.focus() } }} className="rounded-lg p-1 text-muted"><X size={18} /></button></div>
      <p className="break-all px-2 pb-3 pt-1 text-xs text-muted">{email}</p>
      <button type="button" disabled={busy} aria-busy={busy} onClick={async () => {
        if (busy) return
        setBusy(true); setError('')
        try { await endSession(); window.location.assign('/driver-login') }
        catch { setError('Could not sign out. Please try again.'); setBusy(false) }
      }} className="flex w-full items-center gap-2 rounded-xl border-t border-line px-3 py-3 text-sm font-semibold text-heading hover:bg-surface disabled:opacity-60"><LogOut size={17} />{busy ? 'Signing out…' : 'Sign out'}</button>
      {error && <p role="alert" className="px-2 pt-2 text-sm text-error">{error}</p>}
    </div>
  </details>
}
