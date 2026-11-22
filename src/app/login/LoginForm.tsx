'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CalendarDays, ClipboardPaste, Eye, EyeOff, ShieldCheck, Route, MailCheck } from 'lucide-react'
import { loginDestination } from '@/lib/auth/login-destination'
import { authClient } from '@/lib/auth/client'
import { endSession } from '@/lib/auth/sign-out'
import { useSiteSession } from '@/components/providers/SessionProvider'
import { portalNavigation } from '@/lib/auth/portal-navigation'

type Mode = 'login' | 'register' | 'verify' | 'reset' | 'reset-code' | 'update'
type AuthFailure = { message?: string; code?: string } | null

function authMessage(error: AuthFailure, fallback: string) {
  const code = error?.code || ''
  if (code === 'INVALID_OTP' || code === 'OTP_EXPIRED') return 'That code is incorrect or has expired. Request a new one.'
  if (code === 'TOO_MANY_ATTEMPTS') return 'Too many attempts. Request a new code and try again.'
  return error?.message || fallback
}

export function LoginForm({ portal = 'customer', initialMode }: { portal?: 'customer' | 'driver' | 'admin'; initialMode?: Mode }) {
  const search = useSearchParams()
  const { user: activeUser } = useSiteSession()
  const driverIntent = portal === 'driver'
  const adminIntent = portal === 'admin'
  const activeAccount = portalNavigation(activeUser?.role)
  const differentPortal = !!activeUser && activeAccount.kind !== 'guest' && activeAccount.kind !== portal
  const loginPath = adminIntent ? '/admin-login' : driverIntent ? '/driver-login' : '/login'
  const confirmationPath = `/auth/confirm?portal=${portal}`
  const allowedModes: Mode[] = adminIntent
    ? ['login', 'update']
    : portal === 'customer'
      ? ['login', 'register', 'verify', 'reset', 'reset-code', 'update']
      : ['login', 'verify', 'reset', 'reset-code', 'update']
  const requestedMode = initialMode || search.get('mode') || 'login'
  const [mode, setMode] = useState<Mode>(allowedModes.includes(requestedMode as Mode) ? requestedMode as Mode : 'login')
  const showAccountSwitch = differentPortal && (mode === 'login' || mode === 'register')
  const [resendCoolingDown, setResendCoolingDown] = useState(false)
  const verificationHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (mode === 'verify') verificationHeading.current?.focus() }, [mode])
  useEffect(() => {
    if (!resendCoolingDown) return
    const timer = setTimeout(() => setResendCoolingDown(false), 30000)
    return () => clearTimeout(timer)
  }, [resendCoolingDown])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const submittedCode = useRef('')
  const submitting = useRef(false)
  const [message, setMessage] = useState(search.has('error') ? 'Please sign in with an account that has access, or request a new confirmation code.' : search.get('reset') === 'complete' ? 'Your password was reset. Sign in with your new password.' : search.get('complete') === '1' ? 'Email confirmation is complete. Sign in to continue.' : '')
  function changeMode(next: Mode) {
    setMode(next)
    setShowPassword(false)
    setCode('')
    submittedCode.current = ''
    setMessage('')
  }
  function setDigits(value: string) {
    setCode(value.replace(/\D/g, '').slice(0, 6))
  }
  async function pasteCode() {
    try {
      const text = await navigator.clipboard.readText()
      const digits = text.replace(/\D/g, '').slice(0, 6)
      if (digits.length !== 6) throw new Error('Copy the 6-digit code from the email first.')
      setDigits(digits)
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error && error.message.startsWith('Copy the 6-digit') ? error.message : 'Allow clipboard access, or select the code in the email and paste it here.')
    }
  }
  useEffect(() => {
    if (mode !== 'verify' || code.length !== 6 || busy || submittedCode.current === code) return
    if (!formRef.current?.checkValidity()) return
    submittedCode.current = code
    formRef.current.requestSubmit()
  }, [mode, code, busy])
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
  async function sendVerificationCode() {
    const result = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: 'email-verification' })
    if (result.error) throw new Error(authMessage(result.error, 'Could not send a confirmation code. Please try again later.'))
    setCode('')
    submittedCode.current = ''
    setResendCoolingDown(true)
    setMessage('If this email needs confirmation, we sent a 6-digit code. It expires in 10 minutes.')
    setMode('verify')
  }
  async function sendResetCode() {
    const result = await authClient.emailOtp.requestPasswordReset({ email: email.trim() })
    if (result.error) throw new Error(authMessage(result.error, 'Could not send a reset code. Please try again later.'))
    setMessage('If an account exists, we sent a 6-digit code. It expires in 10 minutes.')
    setCode('')
    setMode('reset-code')
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setBusy(true); setMessage('')
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
        else {
          setCode('')
          setPassword('')
          setShowPassword(false)
          submittedCode.current = ''
          setMode('verify')
          setMessage('Enter the 6-digit code we sent to your email.')
        }
      } else if (mode === 'verify') {
        if (code.length !== 6) throw new Error('Enter the 6-digit code from your email.')
        const { data, error } = await authClient.emailOtp.verifyEmail({ email: email.trim(), otp: code })
        if (error) throw new Error(authMessage(error, 'That code could not be confirmed.'))
        if (data?.token) await goToPortal()
        else {
          setPassword('')
          setMode('login')
          setMessage('Email confirmed. Sign in with your password to continue.')
        }
      } else if (mode === 'reset') {
        await sendResetCode()
      } else if (mode === 'reset-code') {
        if (code.length !== 6) throw new Error('Enter the 6-digit code from your email.')
        const { error } = await authClient.emailOtp.resetPassword({ email: email.trim(), otp: code, password })
        if (error) throw new Error(authMessage(error, 'That code could not reset the password.'))
        window.location.assign(`${loginPath}?reset=complete`)
      } else {
        const token = search.get('token')
        if (!token) throw new Error('Request a new password code from the sign-in screen.')
        const { error } = await authClient.resetPassword({ newPassword: password, token })
        if (error) throw new Error(error.message || 'Please try again.')
        window.location.assign(`${loginPath}?reset=complete`)
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.') }
    finally { submitting.current = false; setBusy(false) }
  }
  const input = 'w-full rounded-xl border border-line bg-bg px-4 py-3 text-heading outline-none transition-colors focus:border-focus focus:ring-2 focus:ring-primary/20'
  const showPasswordField = mode === 'login' || mode === 'register' || mode === 'reset-code' || mode === 'update'
  const title = mode === 'verify' ? 'Check your email' : mode === 'reset' ? 'Reset your password' : mode === 'reset-code' ? 'Enter your reset code' : mode === 'register' ? 'Create your account' : mode === 'update' ? 'Set a new password' : adminIntent || !driverIntent ? 'Welcome back' : 'Driver sign in'
  const visual = adminIntent ? {
    image: '/photos/airport.jpg', alt: 'Iceland Taxi driver welcoming a passenger at the airport', badge: 'Operations workspace', title: 'Every journey, under your control.', body: 'Keep your team moving. Plan the day, manage your fleet and give every guest a smooth Icelandic journey.', first: 'Bookings & schedules', second: 'Drivers & fleet', footer: 'Authorised staff access',
  } : driverIntent ? {
    image: '/photos/private-driver.jpg', alt: 'A driver on an Icelandic journey', badge: 'Driver portal', title: 'Your next journey starts here.', body: 'See your assigned journeys, stay in touch with operations and help every guest travel with confidence.', first: 'Assigned journeys', second: 'Team messages', footer: 'Invited drivers only',
  } : {
    image: '/photos/golden-circle.jpg', alt: 'The scenic Golden Circle in Iceland', badge: 'Explore Iceland', title: 'Your Icelandic journey awaits.', body: 'From airport arrivals to unforgettable private tours, keep your travel plans together in one place.', first: 'Your bookings', second: 'Private journeys', footer: 'Travel with Iceland Taxi Booking',
  }
  const formContent = <div className="w-full px-6 py-8 text-slate-900 sm:px-10 sm:py-12 lg:px-14">
      <Link href="/" aria-label="Iceland Taxi home" className="block w-fit rounded-xl bg-white p-3"><Image src="/brand/logo-dark-navy-text.webp" alt="Iceland Taxi Booking" width={180} height={90} className="h-20 w-auto object-contain" priority /></Link>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-muted">{adminIntent ? 'Administration' : driverIntent ? 'Driver portal' : 'Customer account'}</p>
      <h1 ref={verificationHeading} tabIndex={-1} className="mt-6 text-3xl font-bold outline-none">{title}</h1>
      <p className="mt-2 text-sm text-muted">{mode === 'verify' ? 'Confirm your email address using the 6-digit code. It expires in 10 minutes.' : mode === 'reset' ? 'We will email a 6-digit code. It expires in 10 minutes.' : mode === 'reset-code' ? 'Type the code from your email, then choose a new password.' : adminIntent ? 'Sign in to manage bookings, your driving team and the journeys ahead.' : driverIntent ? 'Use the email address and password sent by operations. Driver accounts are created by an administrator.' : mode === 'register' ? 'Create a customer account to manage your bookings.' : 'Sign in to book a ride, view your trips and message our team.'}</p>
      {showAccountSwitch && <div role="status" className="mt-6 space-y-3 rounded-xl border border-line bg-bg p-4 text-sm">
        <p>You are signed in as {activeUser.name || activeUser.email} ({activeAccount.roleLabel}). Sign out below to use a different account.</p>
        <Link href={activeAccount.href} className="inline-block font-semibold text-heading underline">Continue to {activeAccount.label.toLowerCase()}</Link>
      </div>}
      {!showAccountSwitch && mode === 'verify' && <div className="mt-6 rounded-2xl border border-line bg-slate-50 p-5">
        <MailCheck aria-hidden="true" size={32} className="mb-4 text-heading" />
        <p className="text-sm leading-relaxed">Check {email.trim() ? <strong className="break-all">{email.trim()}</strong> : 'your inbox'} for your 6-digit confirmation code. Enter it below to verify your account.</p>
        <p className="mt-3 text-sm text-muted">If you don’t see it, check your spam or junk folder. Delivery may take a few minutes.</p>
      </div>}
      {!showAccountSwitch && <><form ref={formRef} onSubmit={submit} className="mt-6 space-y-4">
        {mode === 'register' && <label className="block">Name<input className={`${input} mt-2`} required value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" autoComplete="name" maxLength={100} /></label>}
        {mode !== 'update' && <label className="block">Email<input className={`${input} mt-2`} type="email" required value={email} onChange={e => { setEmail(e.target.value); if (mode === 'verify') { setCode(''); submittedCode.current = '' } }} placeholder="you@example.com" autoComplete="email" /></label>}
        {(mode === 'verify' || mode === 'reset-code') && <div>
          <label htmlFor="auth-code" className="block">Email code</label>
          <input id="auth-code" name="one-time-code" className={`${input} mt-2 text-center text-2xl tracking-[0.4em]`} inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setDigits(e.target.value)} placeholder="000000" aria-describedby="auth-code-hint" />
          <span id="auth-code-hint" className="mt-1 block text-xs text-muted">Select the code in the email to copy it. On your phone, it can also appear above the keyboard.</span>
          <button type="button" disabled={busy} onClick={() => { void pasteCode() }} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-heading underline underline-offset-4 disabled:opacity-60"><ClipboardPaste size={16} aria-hidden="true" /> Paste code</button>
        </div>}
        {showPasswordField && <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="auth-password" className="block">Password</label>
            {mode === 'login' && !adminIntent && <button type="button" disabled={busy} onClick={() => changeMode('reset')} className="text-sm font-semibold text-heading underline underline-offset-4 hover:text-muted disabled:opacity-60">Forgot password?</button>}
          </div>
          <div className="relative mt-2">
            <input id="auth-password" className={`${input} pr-14`} type={showPassword ? 'text' : 'password'} maxLength={128} required minLength={mode === 'login' ? 1 : 12} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'login' ? 'Enter your password' : mode === 'register' ? 'Create a password' : 'Enter a new password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} aria-describedby={mode !== 'login' ? 'auth-password-hint' : undefined} />
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} aria-controls="auth-password" disabled={busy} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted hover:text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">
              {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </div>
          {mode !== 'login' && <span id="auth-password-hint" className="text-xs text-muted">Use at least 12 characters.</span>}
        </div>}
        {message && <p role="status" className="text-sm">{message}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-60">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'verify' ? 'Confirm email' : mode === 'reset' ? 'Send code' : 'Save password'}</button>
      </form>
      <div className="mt-5 flex flex-wrap gap-4 text-sm">{search.get('complete') === '1' && activeUser && <button onClick={() => { void goToPortal().catch(error => setMessage(error.message)) }}>Continue to your account</button>}
        {mode !== 'login' && <Link href={loginPath} onClick={() => changeMode('login')}>{mode === 'verify' ? 'Go to sign in' : 'Sign in'}</Link>}
        {mode === 'login' && portal === 'customer' && <Link href="/signup">Create customer account</Link>}
        {mode === 'verify' && <button type="button" disabled={busy} onClick={() => { setEmail(''); changeMode(portal === 'customer' ? 'register' : 'login') }}>Use a different email</button>}
      </div>
      {(mode === 'verify' || mode === 'reset-code' || (!adminIntent && mode === 'login')) && <button type="button" disabled={busy || resendCoolingDown} className="mt-4 text-sm text-muted disabled:opacity-60" onClick={async () => {
        if (!email.trim()) { setMessage('Enter your email address first.'); return }
        if (busy || resendCoolingDown) return
        setBusy(true)
        try {
          if (mode === 'reset-code') await sendResetCode()
          else await sendVerificationCode()
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not send a code. Please try again later.') }
        finally { setBusy(false) }
      }}>{busy ? 'Requesting code…' : resendCoolingDown ? 'Resend available shortly' : mode === 'reset-code' ? 'Resend password code' : 'Resend confirmation code'}</button>}</>}
      {showAccountSwitch && message && <p role="status" className="mt-3 text-sm">{message}</p>}
      {activeUser && <button className="mt-5 text-sm text-muted" onClick={async () => { try { await endSession(); window.location.assign(loginPath) } catch { setMessage('Could not sign out. Please try again shortly.') } }}>Sign out of current account</button>}
    </div>

  return <main className="flex min-h-dvh items-center justify-center bg-[#081b35] px-4 py-6 font-sans sm:p-8" style={{ colorScheme: 'light', backgroundImage: 'radial-gradient(ellipse at top left, #183959 0%, transparent 55%), radial-gradient(ellipse at bottom right, #173d4a 0%, transparent 50%)' }}>
    <div className="w-full max-w-[1080px]">
      <Link href="/" className="mb-5 inline-flex items-center gap-2 px-1 text-sm font-medium text-white/75 transition-colors hover:text-white"><ArrowLeft size={16} /> Back to the website</Link>
      <section className="grid overflow-hidden rounded-[28px] bg-white p-2 shadow-2xl sm:rounded-[32px] sm:p-3 md:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative hidden min-h-[640px] flex-col justify-between overflow-hidden rounded-[24px] bg-[#0b213e] p-9 text-white md:flex lg:p-11">
          <img src={visual.image} alt={visual.alt} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06162e] via-[#06162e]/70 to-[#06162e]/30" />
          <div className="relative inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]"><ShieldCheck size={14} className="text-[#ffc400]" /> {visual.badge}</div>
          <div className="relative"><div className="mb-6 h-1 w-12 rounded-full bg-[#ffc400]" /><h2 className="font-display text-4xl font-extrabold leading-[1.13] tracking-tight lg:text-[44px]">{visual.title}</h2><p className="mt-5 max-w-xs text-sm leading-7 text-white/75">{visual.body}</p><div className="mt-9 grid grid-cols-2 gap-3 border-t border-white/20 pt-6"><div><CalendarDays size={19} className="mb-3 text-[#ffc400]" /><p className="text-xs font-semibold">{visual.first}</p></div><div><Route size={19} className="mb-3 text-[#ffc400]" /><p className="text-xs font-semibold">{visual.second}</p></div></div></div>
        </aside>
        <div className="flex min-w-0 items-center rounded-2xl bg-white [--bg:#ffffff] [--surface:#ffffff] [--heading:#081d3d] [--text:#334155] [--muted:#64748b] [--border:#e2e8f0] [--primary:#ffc400] [--on-primary:#081d3d]">{formContent}</div>
      </section>
      <p className="mt-5 text-center text-xs text-white/50">Iceland Taxi Booking · {visual.footer}</p>
    </div>
  </main>
}
