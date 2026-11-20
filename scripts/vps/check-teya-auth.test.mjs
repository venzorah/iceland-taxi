import assert from 'node:assert/strict'
import test from 'node:test'
import { checkTeyaAuth } from './check-teya-auth.mjs'

const environment = { TEYA_ENVIRONMENT: 'production', NEXT_PUBLIC_APP_URL: 'https://merchant.example', TEYA_CLIENT_ID: 'fixture-id', TEYA_CLIENT_SECRET: 'private-fixture-secret', TEYA_STORE_ID: 'fixture-store', TEYA_WEBHOOK_PUBLIC_KEY: 'fixture-key' }

test('OAuth diagnostic never calls checkout or prints tokens, credentials or reflected errors', async () => {
  for (const scenario of ['success', 'unauthorized', 'network', 'timeout', 'missing-token']) {
    const lines = [], calls = []
    const result = await checkTeyaAuth(environment, async (url, options) => {
      calls.push(url)
      assert.equal(url, 'https://id.teya.com/oauth/v2/oauth-token')
      assert.equal(options.redirect, 'error')
      assert.equal(options.body.get('client_secret'), environment.TEYA_CLIENT_SECRET)
      assert.equal(options.body.get('grant_type'), 'client_credentials')
      if (scenario === 'network') throw Object.assign(new Error(environment.TEYA_CLIENT_SECRET), { cause: { code: 'ENOTFOUND' } })
      if (scenario === 'timeout') throw new DOMException(environment.TEYA_CLIENT_SECRET, 'TimeoutError')
      if (scenario === 'unauthorized') return Response.json({ error: 'invalid_client', description: environment.TEYA_CLIENT_SECRET }, { status: 401 })
      return Response.json(scenario === 'success' ? { access_token: 'private-fixture-token', scope: 'checkout/sessions/create' } : { error: 'private-fixture-secret' })
    }, line => lines.push(line))
    assert.equal(calls.length, 1)
    assert.equal(result, scenario === 'success' ? 0 : 1)
    assert.doesNotMatch(lines.join('\n'), /private-fixture|fixture-id|fixture-store|fixture-key/)
    if (scenario === 'unauthorized') assert.match(lines.join('\n'), /HTTP 401\nOAuth error: invalid_client/)
    if (scenario === 'network') assert.match(lines.join('\n'), /ENOTFOUND/)
  }
})

test('missing configuration prevents requests; sandbox uses only the staging OAuth host', async () => {
  let calls = 0
  const request = async url => { calls++; assert.equal(url, 'https://id.teya.xyz/oauth/v2/oauth-token'); return Response.json({ access_token: 'not-printed' }) }
  assert.equal(await checkTeyaAuth({ ...environment, TEYA_ENVIRONMENT: undefined }, request, () => {}), 1)
  assert.equal(await checkTeyaAuth({ ...environment, TEYA_CLIENT_SECRET: '' }, request, () => {}), 1)
  assert.equal(calls, 0)
  assert.equal(await checkTeyaAuth({ ...environment, TEYA_ENVIRONMENT: 'sandbox' }, request, () => {}), 0)
  assert.equal(calls, 1)
})
