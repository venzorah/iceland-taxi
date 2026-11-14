import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
nextEnv.loadEnvConfig(process.cwd())
const email = process.argv[2]
const rounds = Math.min(20, Math.max(1, Number(process.argv[3]) || 3))
const pause = Math.min(30000, Math.max(0, Number(process.env.READ_CHECK_PAUSE_MS) || 0))
if (!email) throw new Error('Pass the approved test account email.')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
if (error) throw new Error('Temporary authentication could not be prepared.')
const jar = new Map()
const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: values => values.forEach(({ name, value }) => jar.set(name, value)) } })
try {
  const verified = await client.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
  if (verified.error) throw new Error('Temporary session verification failed.')
  const cookie = [...jar].map(([key, value]) => key + '=' + value).join('; ')
  for (let round = 1; round <= rounds; round++) {
    const results = await Promise.all(['/api/auth/session', '/api/messages/alerts?as=staff', '/api/listings'].map(async path => {
      const start = performance.now()
      const response = await fetch('http://127.0.0.1:3101' + path, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(45000) })
      const body = await response.json()
      if (path === '/api/auth/session' && response.ok && body.user?.role !== 'SUPER_ADMIN') throw new Error('Unexpected account permissions')
      return { path, status: response.status, milliseconds: Math.round(performance.now() - start) }
    }))
    console.log(JSON.stringify({ round, results }))
    if (results.some(result => result.status !== 200)) process.exitCode = 1
    if (round < rounds && pause) await new Promise(resolve => setTimeout(resolve, pause))
  }
} finally { await client.auth.signOut({ scope: 'local' }); console.log('Temporary test session signed out. No email sent; no business data changed.') }
