'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { UserRound, X } from 'lucide-react'
import { useSiteSession } from '@/components/providers/SessionProvider'
import { t, type Lang } from '@/lib/design/i18n'

export function AccountNavigation({ language, mobile = false }: { language: Lang; mobile?: boolean }) {
  const { user, loading, accountHref, signOut } = useSiteSession()
  const menu = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && menu.current?.open) { menu.current.open = false; trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const style = mobile ? 'flex items-center justify-center gap-2 rounded-2xl border border-line px-3 py-3.5 text-sm font-semibold text-heading' : 'inline-flex items-center gap-2 whitespace-nowrap px-2 py-2 text-sm font-semibold text-heading'
  if (loading) return <span aria-busy="true" className={style}>…</span>
  if (!user) return <Link href="/login" className={style}><UserRound size={17} />{t(language, 'signIn')}</Link>
  async function logout() {
    setBusy(true); setError('')
    try { await signOut() } catch { setError('Could not sign out. Please try again.'); setBusy(false) }
  }
  if (mobile) return <div className="col-span-2 space-y-2">
    <p className="truncate text-sm text-muted">{user.name || user.email}</p>
    <div className="grid grid-cols-2 gap-2"><Link href={accountHref} className={style}><UserRound size={17} />{language === 'is' ? 'Mín síða' : 'My account'}</Link><button onClick={logout} disabled={busy} className={style}>{busy ? '…' : t(language, 'logOut')}</button></div>
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
  </div>
  return <details ref={menu} className="group relative">
    <summary ref={trigger} className={`${style} cursor-pointer list-none`}><UserRound size={17} />{language === 'is' ? 'Mín síða' : 'My account'}</summary>
    <div className="absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-line bg-bg p-3 shadow-lg">
      <div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate px-2 py-2 text-sm text-muted">{user.name || user.email}</p><button type="button" onClick={() => { if (menu.current) menu.current.open = false; trigger.current?.focus() }} aria-label="Close account menu" className="rounded-full p-2 text-heading hover:bg-surface"><X size={17} /></button></div>
      <Link href={accountHref} onClick={() => { if (menu.current) menu.current.open = false }} className="block rounded-xl px-3 py-3 text-sm font-semibold text-heading hover:bg-surface">{language === 'is' ? 'Mín síða' : 'My account'}</Link>
      <button disabled={busy} onClick={logout} className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-heading hover:bg-surface disabled:opacity-60">{busy ? '…' : t(language, 'logOut')}</button>
      {error && <p role="alert" className="px-3 text-sm text-error">{error}</p>}
    </div>
  </details>
}
