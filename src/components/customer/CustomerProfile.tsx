'use client'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useSiteSession } from '@/components/providers/SessionProvider'
type Profile = { name: string | null; email: string; phone: string | null; category: 'INTERNATIONAL' | 'RESIDENT'; preferredCurrency: 'EUR' | 'ISK'; preferredLang: 'en' | 'is' }
export function CustomerProfile() {
  const { user } = useSiteSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [message, setMessage] = useState('')
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
    try { const supabase = createSupabaseBrowserClient(); const verified = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword }); if (verified.error) throw new Error('Your current password could not be verified.'); const result = await supabase.auth.updateUser(email ? { email: email.trim() } : { password }, { emailRedirectTo: `${window.location.origin}/auth/confirm` }); if (result.error) throw result.error; setCurrentPassword(''); setPassword(''); setEmail(''); setMessage(email ? 'Check your current and new email inboxes to confirm the email change.' : 'Your password was updated.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update account security.') } finally { setBusy(false) }
  }
  return <details className="mt-5 rounded-2xl border border-line bg-bg p-4"><summary className="cursor-pointer font-semibold text-heading">Profile & account security</summary>
    {message && <p role="status" className="mt-3 text-sm text-heading">{message}</p>}
    {profile && <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Name<input required maxLength={100} className={input} value={profile.name || ''} onChange={e => setProfile({ ...profile, name: e.target.value })} autoComplete="name" /></label><label className="text-sm">Phone<input type="tel" maxLength={30} className={input} value={profile.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} autoComplete="tel" /></label><label className="text-sm">Customer category<select className={input} value={profile.category} onChange={e => setProfile({ ...profile, category: e.target.value as Profile['category'] })}><option value="INTERNATIONAL">Visiting Iceland</option><option value="RESIDENT">Iceland resident</option></select></label><label className="text-sm">Preferred currency<select className={input} value={profile.preferredCurrency} onChange={e => setProfile({ ...profile, preferredCurrency: e.target.value as Profile['preferredCurrency'] })}><option>EUR</option><option>ISK</option></select></label><label className="text-sm">Language<select className={input} value={profile.preferredLang} onChange={e => setProfile({ ...profile, preferredLang: e.target.value as Profile['preferredLang'] })}><option value="en">English</option><option value="is">Íslenska</option></select></label><button disabled={busy} className="self-end rounded-xl bg-primary p-3 font-semibold text-on-primary disabled:opacity-50">Save profile</button></form>}
    <form onSubmit={security} className="mt-6 grid gap-3 border-t border-line pt-4 sm:grid-cols-2"><p className="text-sm text-muted sm:col-span-2">Current email: {user?.email}. Enter your current password to change your password or email.</p><label className="text-sm">Current password<input type="password" autoComplete="current-password" required className={input} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label><label className="text-sm">New password<input type="password" autoComplete="new-password" minLength={12} disabled={!!email} required={!email} className={input} value={password} onChange={e => setPassword(e.target.value)} /></label><label className="text-sm">New email (optional)<input type="email" disabled={!!password} className={input} value={email} onChange={e => setEmail(e.target.value)} /></label><button disabled={busy} className="self-end rounded-xl border border-line p-3 font-semibold text-heading disabled:opacity-50">Update account security</button></form>
  </details>
}
