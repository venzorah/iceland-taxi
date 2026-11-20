// Read-only OAuth diagnostic: never creates checkout sessions, payments or refunds.
// Run on the VPS with Node 22 and the same environment file used by systemd:
// node --env-file=/etc/iceland-taxi/app.env scripts/vps/check-teya-auth.mjs
import { pathToFileURL } from 'node:url'

const scopes = 'checkout/sessions/create checkout/sessions/id/get refunds/create'
const oauthErrors = new Set(['invalid_client', 'invalid_scope', 'unauthorized_client', 'invalid_grant', 'invalid_request', 'access_denied', 'unsupported_grant_type', 'server_error', 'temporarily_unavailable'])
const networkErrors = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'ERR_TLS_CERT_ALTNAME_INVALID'])

export async function checkTeyaAuth(environment = process.env, request = globalThis.fetch, output = console.log) {
  const selected = environment.TEYA_ENVIRONMENT?.trim()
  if (!['production', 'sandbox'].includes(selected)) {
    output('Set TEYA_ENVIRONMENT explicitly to production for live credentials or sandbox for staging credentials. The app defaults to sandbox when it is missing. No request was sent.')
    return 1
  }
  output(`Environment: ${selected}`)
  let publicOriginValid = false
  try {
    const url = new URL(environment.NEXT_PUBLIC_APP_URL || '')
    publicOriginValid = url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  } catch { /* Print only validation status, never arbitrary environment values. */ }
  output(`Public HTTPS app origin: ${publicOriginValid ? 'valid' : 'invalid or missing; check NEXT_PUBLIC_APP_URL'}`)
  output(`Webhook public key: ${environment.TEYA_WEBHOOK_PUBLIC_KEY?.trim() ? 'present (validity not tested)' : 'missing'}`)
  const clientId = environment.TEYA_CLIENT_ID || environment.TEYA_MERCHANT_ID
  const clientSecret = environment.TEYA_CLIENT_SECRET || environment.TEYA_API_KEY
  const missing = [!clientId && 'TEYA_CLIENT_ID', !clientSecret && 'TEYA_CLIENT_SECRET', !environment.TEYA_STORE_ID && 'TEYA_STORE_ID'].filter(Boolean)
  if (missing.length) {
    output(`Missing: ${missing.join(', ')}. No request was sent.`)
    return 1
  }
  const endpoint = selected === 'production' ? 'https://id.teya.com/oauth/v2/oauth-token' : 'https://id.teya.xyz/oauth/v2/oauth-token'
  output(`Testing OAuth only: ${endpoint}`)
  try {
    const response = await request(endpoint, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'IcelandTaxiBooking/1.0' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: scopes }),
    })
    output(`OAuth response: HTTP ${response.status}`)
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      // Provider descriptions may echo private request data: print only known codes.
      if (oauthErrors.has(data?.error)) output(`OAuth error: ${data.error}`)
      output('Authentication failed. No checkout or payment was created.')
      return 1
    }
    if (typeof data?.access_token !== 'string' || !data.access_token) {
      output('No usable access token in the OAuth response. No checkout or payment was created.')
      return 1
    }
    if (typeof data.scope === 'string') {
      const granted = new Set(data.scope.split(/\s+/))
      for (const scope of scopes.split(' ')) output(`${scope}: ${granted.has(scope) ? 'granted' : 'not listed in token response'}`)
    }
    output('Authentication succeeded. Store access and checkout acceptance still need verification. No checkout or payment was created; the token was not displayed or written to disk.')
    return 0
  } catch (error) {
    const timeout = ['TimeoutError', 'AbortError'].includes(error?.name)
    const code = error?.cause?.code || error?.code
    output(timeout ? 'OAuth request timed out.' : `OAuth connection failed${networkErrors.has(code) ? ` (${code})` : ''}.`)
    output('No checkout or payment was created. No credentials or raw error details were printed.')
    return 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await checkTeyaAuth()
}
