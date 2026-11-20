'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { loginDestination } from '@/lib/auth/login-destination'
import { authClient } from '@/lib/auth/client'
import { endSession } from '@/lib/auth/sign-out'
import { useSiteSession } from '@/components/providers/SessionProvider'
import { portalNavigation } from '@/lib/auth/portal-navigation'

type Mode = 'login' | 'register' | 'reset' | 'update'
export function LoginForm({ portal = 'customer', initialMode }: { portal?: 'customer' | 'driver' | 'admin'; initialMode?: Mode }) {
  const search = useSearchParams()
  const { user: activeUser } = useSiteSession()
  const driverIntent = portal === 'driver'
  const adminIntent = portal === 'admin'
  const activeAccount = portalNavigation(activeUser?.role)
  const differentPortal = !!activeUser && activeAccount.kind !== 'guest' && activeAccount.kind !== portal
  const loginPath = adminIntent ? '/admin-login' : driverIntent ? '/driver-login' : '/login'
  const confirmationPath = `/auth/confirm?portal=${portal}`
  const allowedModes = portal === 'customer' ? ['login', 'register', 'reset', 'update'] : ['login', 'reset', 'update']
  const requestedMode = initialMode || search.get('mode') || 'login'
  const [mode, setMode] = useState<Mode>(allowedModes.includes(requestedMode) ? requestedMode as Mode : 'login')
  const showAccountSwitch = differentPortal && (mode === 'login' || mode === 'register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(search.has('error') ? 'Please sign in with an account that has access, or request a new confirmation link.' : search.get('reset') === 'complete' ? 'Your password was reset. Sign in with your new password.' : search.get('complete') === '1' ? 'Email confirmation is complete. Sign in to continue.' : '')
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
    if (adminIntent && !session.staff) throw new Error('This account does not have administrator access.')
    const destination = loginDestination(session, search.get('next'), window.location.origin, driverIntent)
    if (!destination) throw new Error(driverIntent ? 'This account does not have driver access. Use the email registered by operations, or contact our team.' : 'This account does not have access to a portal. Please contact our team.')
    window.location.assign(destination)
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    try {
      if (mode === 'login') {
        const { error } = await authClient.signIn.email({ email: email.trim(), password })
        if (error) throw new Error(error.message || 'Please try again.')
        await goToPortal()
      } else if (mode === 'register') {
        if (portal !== 'customer') throw new Error('This account must be created by an administrator.')
        const { data, error } = await authClient.signUp.email({ email: email.trim(), password, name: name.trim(),
          callbackURL: confirmationPath })
        if (error) throw new Error(error.message || 'Please try again.')
        if (data.token) await goToPortal()
        else setMessage('Check your email to confirm your account, then sign in.')
      } else if (mode === 'reset') {
        const { error } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: `${loginPath}?mode=update` })
        if (error) throw new Error(error.message || 'Please try again.')
        setMessage('If an account exists, you will receive a password reset email.')
      } else {
        const token = search.get('token')
        if (!token) throw new Error('Open a new password reset link from your email.')
        const { error } = await authClient.resetPassword({ newPassword: password, token })
        if (error) throw new Error(error.message || 'Please try again.')
        window.location.assign(`${loginPath}?reset=complete`)
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy(false) }
  }
  const input = 'w-full rounded-xl border border-line bg-bg px-4 py-3 text-heading'
  return <main className={`flex min-h-screen items-center justify-center px-4 py-12 text-heading ${adminIntent ? 'bg-slate-950' : driverIntent ? 'bg-slate-100' : 'bg-bg'}`}>
    <div className={`w-full max-w-md rounded-3xl border bg-surface p-7 shadow-xl ${adminIntent ? 'border-slate-700 border-t-4' : driverIntent ? 'border-line border-t-4 border-t-primary' : 'border-line'}`}>
      <Link href="/" aria-label="Iceland Taxi home" className="mx-auto block w-fit rounded-xl bg-white p-3"><Image src="/brand/logo-dark-navy-text.png" alt="Iceland Taxi Booking" width={180} height={90} className="h-20 w-auto object-contain" priority /></Link>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-muted">{adminIntent ? 'Administration' : driverIntent ? 'Driver portal' : 'Customer account'}</p>
      <h1 className="mt-6 text-3xl font-bold">{mode === 'login' ? (adminIntent ? 'Admin sign in' : driverIntent ? 'Driver sign in' : 'Welcome back') : mode === 'register' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Set a new password'}</h1>
      <p className="mt-2 text-sm text-muted">{adminIntent ? 'Secure access for authorised Iceland Taxi staff. Contact your administrator if you need an account.' : driverIntent ? 'Use the email address and password sent by operations. Driver accounts are created by an administrator.' : mode === 'register' ? 'Create a customer account to manage your bookings.' : 'Sign in to book a ride, view your trips and message our team.'}</p>
      {showAccountSwitch && <div role="status" className="mt-6 space-y-3 rounded-xl border border-line bg-bg p-4 text-sm">
        <p>You are signed in as {activeUser.name || activeUser.email} ({activeAccount.roleLabel}). Sign out below to use a different account.</p>
        <Link href={activeAccount.href} className="inline-block font-semibold text-heading underline">Continue to {activeAccount.label.toLowerCase()}</Link>
      </div>}
      {!showAccountSwitch && <><form onSubmit={submit} className="mt-6 space-y-4">
        {mode === 'register' && <label className="block">Name<input className={`${input} mt-2`} required value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" autoComplete="name" maxLength={100} /></label>}
        {mode !== 'update' && <label className="block">Email<input className={`${input} mt-2`} type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>}
        {mode !== 'reset' && <div>
          <label htmlFor="auth-password" className="block">Password</label>
          <div className="relative mt-2">
            <input id="auth-password" className={`${input} pr-14`} type={showPassword ? 'text' : 'password'} maxLength={128} required minLength={mode === 'login' ? 1 : 12} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'login' ? 'Enter your password' : mode === 'register' ? 'Create a password' : 'Enter a new password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} aria-describedby={mode !== 'login' ? 'auth-password-hint' : undefined} />
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} aria-controls="auth-password" disabled={busy} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted hover:text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">
              {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </div>
          {mode !== 'login' && <span id="auth-password-hint" className="text-xs text-muted">Use at least 12 characters.</span>}
        </div>}
        {message && <p role="status" className="text-sm">{message}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-60">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? (driverIntent ? 'Create driver sign-in' : 'Create account') : mode === 'reset' ? 'Send reset email' : 'Save password'}</button>
      </form>
      <div className="mt-5 flex flex-wrap gap-4 text-sm">{search.get('complete') === '1' && activeUser && <button onClick={() => { void goToPortal().catch(error => setMessage(error.message)) }}>Continue to your account</button>}
        {mode !== 'login' && <Link href={loginPath}>Sign in</Link>}
        {mode === 'login' && <>{portal === 'customer' && <Link href="/signup">Create customer account</Link>}<button onClick={() => changeMode('reset')}>Forgot password?</button></>}
      </div>
      {portal === 'customer' && (mode === 'login' || mode === 'reset') && <button type="button" disabled={busy} className="mt-4 text-sm text-muted" onClick={async () => {
        if(!email.trim()){setMessage('Enter your email address first.');return}
        setBusy(true)
        try{const result=await authClient.sendVerificationEmail({email:email.trim(),callbackURL:confirmationPath});if(result.error)throw new Error(result.error.message);setMessage('If confirmation is needed, check your email for a new link.')}
        catch{setMessage('Could not send a confirmation link. Please try again later.')}finally{setBusy(false)}
      }}>Resend confirmation email</button>}</>}
      {showAccountSwitch && message && <p role="status" className="mt-3 text-sm">{message}</p>}
      <button className="mt-5 text-sm text-muted" onClick={async () => { try { await endSession(); window.location.assign(loginPath) } catch { setMessage('Could not sign out. Please try again shortly.') } }}>Sign out of current account</button>
    </div>
  </main>
}
