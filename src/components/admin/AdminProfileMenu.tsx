'use client'

import { useEffect, useRef } from 'react'
import { LogOut, UserRound } from 'lucide-react'
import { useSiteSession } from '@/components/providers/SessionProvider'
import { endSession } from '@/lib/auth/sign-out'
import { AdminButton } from './AdminUI'

export function AdminProfileMenu() {
  const { user } = useSiteSession()
  const menu = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && menu.current?.open) { menu.current.open = false; menu.current.querySelector('summary')?.focus() } }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [])
  return <details ref={menu} className="relative"><summary aria-label="Admin profile" className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full border border-line bg-surface text-heading"><UserRound size={20} /></summary><div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[85vw] rounded-2xl border border-line bg-bg p-3 shadow-xl"><p className="px-2 pt-1 text-sm font-bold text-heading">{user?.name || 'Staff account'}</p><p className="break-all px-2 py-1 text-xs text-muted">{user?.email}</p><p className="px-2 pb-3 text-xs text-muted">{user?.role.replaceAll('_', ' ')}</p><AdminButton type="button" pendingLabel="Signing out…" onClick={async () => { await endSession(); window.location.assign('/admin-login') }} className="flex w-full items-center gap-2 rounded-xl border-t border-line px-3 py-3 text-sm font-semibold text-heading hover:bg-surface"><LogOut size={17} /> Log out</AdminButton></div></details>
}
