'use client'
import { useNoticeToast } from '@/components/feedback/FormFeedback'
import { useEffect, useRef, useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { useSiteSession } from '@/components/providers/SessionProvider'
type Profile = { name: string | null; email: string; phone: string | null; category: 'INTERNATIONAL' | 'RESIDENT'; preferredCurrency: 'EUR' | 'ISK'; preferredLang: 'en' | 'is' }
export function CustomerProfile() {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const element = dialog.current
    if (!element) return
    const opener = trigger.current
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
    return () => { element.close(); document.body.style.overflow = previous; opener?.focus() }
  }, [open])
  return <>
    <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-5 py-3 text-sm font-semibold text-heading hover:bg-surface"><Pencil size={16} aria-hidden="true" />Edit profile</button>
    <dialog ref={dialog} aria-labelledby="edit-profile-title" onCancel={event => { event.preventDefault(); setOpen(false) }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false) } }} onClick={event => {
      if (event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false)
    }} className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border-0 bg-bg p-0 text-text shadow-2xl backdrop:bg-navy/55 sm:inset-0 sm:m-auto sm:max-h-[85dvh] sm:max-w-2xl sm:rounded-3xl">
      {open && <>
        <header className="sticky top-0 z-10 border-b border-line bg-bg px-5 pb-4 pt-3 sm:px-6 sm:pt-5">
          <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-center justify-between gap-3"><div><h2 id="edit-profile-title" className="font-display text-xl font-bold text-heading">Edit profile</h2><p className="mt-1 text-sm text-muted">Manage your details, preferences and account security.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close edit profile" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-heading"><X size={20} /></button></div>
        </header>
        <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1 sm:px-6"><CustomerProfileForm /></div>
      </>}
    </dialog>
  </>
}

function CustomerProfileForm() {
  const { user } = useSiteSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [message, setMessage] = useState('')
  useNoticeToast(message)
  const [busy, setBusy] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  useEffect(() => { const controller = new AbortController(); fetch('/api/account/profile', { signal: controller.signal, cache: 'no-store' }).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.message); if (!controller.signal.aborted) setProfile(data.profile) }).catch(error => { if (!controller.signal.aborted) setMessage(error.message || 'Could not load profile.') }); return () => controller.abort() }, [])
  const input = 'mt-1 w-full rounded-xl border border-line bg-input px-3 py-2.5 text-heading'
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!profile) return; setBusy(true); setMessage('')
    try { const { email: _email, ...data } = profile; const response = await fetch('/api/account/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, phone: data.phone || '', preferredCurrency: data.preferredCurrency === 'ISK' ? 'ISK' : 'EUR' }) }); const result = await response.json(); if (!response.ok) throw new Error(result.message); setProfile(result.profile); window.dispatchEvent(new Event('itb-profile-updated')); setMessage('Your profile was saved.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save profile.') } finally { setBusy(false) }
  }
  async function security(e: React.FormEvent) {
    e.preventDefault(); if (!user) return; setBusy(true); setMessage('')
    try { const response = await fetch('/api/account/security', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, ...(email ? { email: email.trim() } : { password }) }) }); const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Could not update account security.'); setCurrentPassword(''); setPassword(''); setEmail(''); setMessage(email ? 'Check your current and new email inboxes to confirm the email change.' : 'Your password was updated.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update account security.') } finally { setBusy(false) }
  }
  return <div>
    {!profile && !message && <p className="py-4 text-sm text-muted" aria-busy="true">Loading your profile…</p>}
    {message && <p role="status" className="mt-3 text-sm text-heading">{message}</p>}
    {profile && <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Name<input placeholder="Enter your full name" required maxLength={100} className={input} value={profile.name || ''} onChange={e => setProfile({ ...profile, name: e.target.value })} autoComplete="name" /></label><label className="text-sm">Phone<input placeholder="Include country code" type="tel" maxLength={30} className={input} value={profile.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} autoComplete="tel" /></label><label className="text-sm">Customer category<select className={input} value={profile.category} onChange={e => setProfile({ ...profile, category: e.target.value as Profile['category'] })}><option value="INTERNATIONAL">Visiting Iceland</option><option value="RESIDENT">Iceland resident</option></select></label><label className="text-sm">Preferred currency<select className={input} value={profile.preferredCurrency} onChange={e => setProfile({ ...profile, preferredCurrency: e.target.value as Profile['preferredCurrency'] })}><option>EUR</option><option>ISK</option></select></label><label className="text-sm">Language<select className={input} value={profile.preferredLang} onChange={e => setProfile({ ...profile, preferredLang: e.target.value as Profile['preferredLang'] })}><option value="en">English</option><option value="is">Íslenska</option></select></label><button disabled={busy} className="self-end rounded-xl bg-primary p-3 font-semibold text-on-primary disabled:opacity-50">Save profile</button></form>}
    <form onSubmit={security} className="mt-6 grid gap-3 border-t border-line pt-4 sm:grid-cols-2"><p className="text-sm text-muted sm:col-span-2">Current email: <span className="break-all">{user?.email}</span>. Enter your current password to change your password or email.</p><label className="text-sm">Current password<input type="password" autoComplete="current-password" placeholder="Enter your current password" required className={input} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label><label className="text-sm">New password<input type="password" autoComplete="new-password" placeholder="At least 12 characters" minLength={12} disabled={!!email} required={!email} className={input} value={password} onChange={e => setPassword(e.target.value)} /></label><label className="text-sm">New email (optional)<input type="email" placeholder="you@example.com" disabled={!!password} className={input} value={email} onChange={e => setEmail(e.target.value)} /></label><button disabled={busy} className="self-end rounded-xl border border-line p-3 font-semibold text-heading disabled:opacity-50">Update account security</button></form>
  </div>
}
