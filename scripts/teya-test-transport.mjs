// Explicitly loaded only by the isolated customer verification server. Never imported by app code.
import { readFile } from 'node:fs/promises'
const run = process.env.CUSTOMER_TEST_RUN_ID
if (!run || process.env.TEYA_CLIENT_ID !== 'local-customer-test') throw new Error('Test transport requires an isolated, explicitly configured verification process.')
const realFetch = globalThis.fetch
const attempts = new Map()
const sessions = new Map()
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (url.hostname === 'id.teya.xyz') return Response.json({ access_token: 'local-test-token', expires_in: 3600 })
  if (url.hostname === 'api.teya.xyz') {
    const method = init?.method || (input instanceof Request ? input.method : 'GET')
    if (method === 'POST' && url.pathname === '/v2/checkout/sessions') {
      const body = JSON.parse(input instanceof Request && !init?.body ? await input.clone().text() : String(init?.body || '{}'))
      if (!body.customer?.email?.includes(run) || !body.customer.email.endsWith('@example.invalid')) return Response.json({ error: 'Only this test run’s temporary accounts are allowed.' }, { status: 403 })
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : {}))
      const key = headers.get('idempotency-key')
      if (!key) return Response.json({ error: 'Idempotency key required' }, { status: 400 })
      if (attempts.has(key)) return Response.json(attempts.get(key))
      const id = `test_${run}_${attempts.size + 1}`
      const result = { session_id: id, session_url: `https://checkout.example.invalid/${id}?ref=${encodeURIComponent(body.merchant_reference)}` }
      sessions.set(id, { session_id: id, session_status: 'ACTIVE', payment_status: 'NONE', merchant_reference: body.merchant_reference, amount: body.amount })
      attempts.set(key, result)
      return Response.json(result)
    }
    const id = decodeURIComponent(url.pathname.split('/').at(-1))
    if (!id.startsWith(`test_${run}_`) || !sessions.has(id)) return Response.json({ error: 'Unknown test session' }, { status: 404 })
    let override = {}
    if (process.env.CUSTOMER_TEST_STATE_FILE) {
      try { const state = JSON.parse(await readFile(process.env.CUSTOMER_TEST_STATE_FILE, 'utf8')); override = state[id] || {} } catch { /* Default is unpaid/pending. */ }
    }
    return Response.json({ ...sessions.get(id), ...override })
  }
  if (url.hostname.endsWith('.teya.com')) throw new Error('Live payment hosts are forbidden in verification.')
  return realFetch(input, init)
}
