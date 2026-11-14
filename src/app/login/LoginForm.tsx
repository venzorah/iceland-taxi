'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Mode = 'login' | 'register' | 'reset' | 'update'
export function LoginForm() {
  const search = useSearchParams()
  const [mode, setMode] = useState<Mode>(search.get('mode') === 'update' ? 'update' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(search.has('error') ? 'Please sign in with an account that has access, or request a new confirmation link.' : '')
  function changeMode(next: Mode) {
    setMode(next)
    setShowPassword(false)
    setMessage('')
  }
  async function goToPortal() {
    const res = await fetch('/api/auth/session', { cache: 'no-store' })
    if (!res.ok) throw new Error('Could not load your account. Please try again.')
    const session = await res.json()
    if (!session.user) throw new Error('Confirm your email before signing in.')
    const target = session.staff ? '/admin' : session.driver ? '/driver' : '/account'
    const next = search.get('next')
    const allowed = session.staff ? ['/admin', '/m'] : session.driver ? ['/driver'] : ['/account', '/messages', '/book', '/manage-booking']
    const destination = next ? new URL(next, window.location.origin) : null
    window.location.assign(destination?.origin === window.location.origin && allowed.some(p => destination.pathname === p || destination.pathname.startsWith(p + '/')) ? destination.href : target)
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    try {
      const supabase = createSupabaseBrowserClient()
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        await goToPortal()
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password,
          options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/confirm` } })
        if (error) throw error
        if (data.session) await goToPortal()
        else setMessage('Check your email to confirm your account, then sign in.')
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/confirm?type=recovery` })
        if (error) throw error
        setMessage('If an account exists, you will receive a password reset email.')
      } else {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        await goToPortal()
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy(false) }
  }
  const input = 'w-full rounded-xl border border-line bg-bg px-4 py-3 text-heading'
  return <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12 text-heading">
    <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-7">
      <Link href="/" className="text-sm text-muted">← Iceland Taxi</Link>
      <h1 className="mt-6 text-3xl font-bold">{mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Set a new password'}</h1>
      <p className="mt-2 text-sm text-muted">{mode === 'register' ? 'Customer registration. Driver and staff access is managed by the company.' : 'Secure access for customers, drivers and staff.'}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === 'register' && <label className="block">Name<input className={`${input} mt-2`} required value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" autoComplete="name" maxLength={100} /></label>}
        {mode !== 'update' && <label className="block">Email<input className={`${input} mt-2`} type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>}
        {mode !== 'reset' && <div>
          <label htmlFor="auth-password" className="block">Password</label>
          <div className="relative mt-2">
            <input id="auth-password" className={`${input} pr-14`} type={showPassword ? 'text' : 'password'} required minLength={mode === 'login' ? 1 : 12} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'login' ? 'Enter your password' : mode === 'register' ? 'Create a password' : 'Enter a new password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} aria-describedby={mode !== 'login' ? 'auth-password-hint' : undefined} />
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} aria-controls="auth-password" disabled={busy} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted hover:text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">
              {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </div>
          {mode !== 'login' && <span id="auth-password-hint" className="text-xs text-muted">Use at least 12 characters.</span>}
        </div>}
        {message && <p role="status" className="text-sm">{message}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-60">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'reset' ? 'Send reset email' : 'Save password'}</button>
      </form>
      <div className="mt-5 flex flex-wrap gap-4 text-sm">{search.get('complete') === '1' && <button onClick={() => { void goToPortal().catch(error => setMessage(error.message)) }}>Continue to your account</button>}
        {mode !== 'login' && <button onClick={() => changeMode('login')}>Sign in</button>}
        {mode === 'login' && <><button onClick={() => changeMode('register')}>Create customer account</button><button onClick={() => changeMode('reset')}>Forgot password?</button></>}
      </div>
      <button className="mt-5 text-sm text-muted" onClick={async () => { await createSupabaseBrowserClient().auth.signOut(); window.location.assign('/login') }}>Sign out of current account</button>
    </div>
  </main>
}
