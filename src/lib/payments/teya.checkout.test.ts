import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { teyaProvider } from './teya'

const originalEnvironment = { ...process.env }
const originalFetch = globalThis.fetch
const originalWarn = console.warn
afterEach(() => { process.env = { ...originalEnvironment }; globalThis.fetch = originalFetch; console.warn = originalWarn })

function fixture(id: string) {
  process.env.TEYA_ENVIRONMENT = 'sandbox'
  process.env.TEYA_CLIENT_ID = `fixture-client-${id}`
  process.env.TEYA_CLIENT_SECRET = 'private-client-secret'
  process.env.TEYA_STORE_ID = 'private-store-id'
  return {
    bookingRef: 'private-booking-reference', bookingId: 'private-booking-id',
    idempotencyKey: 'private-stable-attempt', amount: 153, currency: 'EUR' as const,
    description: 'private-booking-description',
    returnUrl: 'https://merchant.example/return?access=private-access-token',
    cancelUrl: 'https://merchant.example/cancel?access=private-access-token',
    customer: { name: 'Private Customer', email: 'private-customer@example.test', phone: '+3547771234' },
  }
}

test('HTTP 400 logs a sanitized validation diagnostic while keeping the rejection result generic', async () => {
  const input = fixture('400')
  const warnings: unknown[][] = []
  console.warn = (...args: unknown[]) => { warnings.push(args) }
  let checkoutCalls = 0
  const requestId = 'b727530c-c13a-45c7-bc12-80b931c1ea5f'
  globalThis.fetch = (async (url, init) => {
    if (String(url).includes('/oauth/')) return Response.json({ access_token: 'private-access-token' })
    checkoutCalls++
    assert.equal(String(url), 'https://api.teya.xyz/v2/checkout/sessions')
    assert.equal(new Headers(init?.headers).get('idempotency-key'), input.idempotencyKey)
    return Response.json({
      code: 'BAD_REQUEST', description: 'private-customer@example.test private-client-secret',
      errors: [{ field: 'customer.phone_number', code: 'INVALID_FORMAT', rejectedValue: input.customer.phone, message: input.returnUrl }],
      request: JSON.parse(String(init?.body)), access_token: 'private-access-token',
    }, { status: 400, headers: { 'x-request-id': requestId } })
  }) as typeof fetch
  const result = await teyaProvider.createCheckout(input)
  assert.equal(result.ok, false)
  assert.equal(checkoutCalls, 1) // No automatic retry or new idempotency key on rejection.
  assert.equal(warnings.length, 1)
  const diagnostic = JSON.parse(String(warnings[0][1])) as { httpStatus: number; providerRequestId: string; providerCodes: string[]; validationFields: string[] }
  assert.equal(diagnostic.httpStatus, 400)
  assert.equal(diagnostic.providerRequestId, requestId)
  assert(diagnostic.providerCodes.includes('BAD_REQUEST'))
  assert(diagnostic.providerCodes.includes('INVALID_FORMAT'))
  assert(diagnostic.validationFields.includes('customer.phone_number'))
  const output = JSON.stringify({ warnings, result })
  for (const privateValue of [process.env.TEYA_CLIENT_ID!, process.env.TEYA_CLIENT_SECRET!, process.env.TEYA_STORE_ID!, input.customer.name, input.customer.email, input.customer.phone, input.bookingRef, input.bookingId, input.idempotencyKey, input.returnUrl, input.cancelUrl, input.description, 'private-access-token']) {
    assert(!output.includes(privateValue), `Private fixture value leaked: ${privateValue}`)
  }
  if (!result.ok) {
    assert.equal(result.code, 'PROVIDER_ERROR')
    assert(!result.message.includes('INVALID_FORMAT'))
    assert(!result.message.includes(requestId))
  }
})

test('non-JSON rejection bodies and secret-shaped correlation IDs are not logged', async () => {
  const input = fixture('html')
  const warnings: unknown[][] = []
  console.warn = (...args: unknown[]) => { warnings.push(args) }
  const uuidToken = '11111111-1111-4111-8111-111111111111'
  globalThis.fetch = (async url => String(url).includes('/oauth/')
    ? Response.json({ access_token: uuidToken })
    : new Response(`<html>private-client-secret ${input.returnUrl} ${input.customer.email}</html>`, { status: 400, headers: { 'x-request-id': uuidToken, 'x-correlation-id': input.returnUrl } })) as typeof fetch
  assert.equal((await teyaProvider.createCheckout(input)).ok, false)
  assert.equal(warnings.length, 1)
  assert.doesNotMatch(JSON.stringify(warnings), /11111111|private-|https:|html/)
})

test('optional phone prefill follows E.164; metadata stays within the documented character limit', async () => {
  const input = fixture('payload')
  const payloads: Record<string, unknown>[] = []
  let warnings = 0
  console.warn = () => { warnings++ }
  globalThis.fetch = (async (url, init) => {
    if (String(url).includes('/oauth/')) return Response.json({ access_token: 'private-access-token' })
    assert.equal(init?.method, 'POST')
    assert.equal(new Headers(init.headers).get('idempotency-key'), input.idempotencyKey)
    assert.equal(new Headers(init.headers).get('user-agent'), 'IcelandTaxiBooking/1.0')
    assert.equal(init.redirect, 'error')
    payloads.push(JSON.parse(String(init.body)))
    return Response.json({ session_id: 'fixture-session', session_url: 'https://checkout.teya.xyz/session/fixture-session' }, { status: 201 })
  }) as typeof fetch
  const description = '🚕'.repeat(510)
  for (const phone of ['+354 (777) 12-34', '+3547771234', '0777 1234', '', '+1234567890123456', 'private-not-a-phone']) {
    const result = await teyaProvider.createCheckout({ ...input, description, customer: { ...input.customer, phone } })
    assert.equal(result.ok, true)
    const payload = payloads.at(-1)!
    const customer = payload.customer as Record<string, unknown>
    assert.equal(customer.phone_number, phone.startsWith('+354') ? '+3547771234' : undefined)
    assert.equal(customer.name, input.customer.name)
    assert.equal(customer.email, input.customer.email)
    assert.deepEqual(payload.amount, { value: 15300, currency: 'EUR' })
    assert.deepEqual(payload.line_items, [{ description, quantity: 1, unit_price: 15300 }])
    assert.equal(Array.from((payload.metadata as { description: string }).description).length, 500)
    assert.equal((payload.metadata as { description: string }).description, '🚕'.repeat(500))
    assert.equal(payload.success_url, input.returnUrl)
    assert.equal(payload.cancel_url, input.cancelUrl)
    assert.equal(payload.type, 'SALE')
  }
  assert.equal(warnings, 0)
  assert.equal(input.customer.phone, '+3547771234') // Original booking contact was not mutated.
})

test('concurrent checkouts share one OAuth request while keeping distinct stable checkout keys', async () => {
  const input = fixture('single-flight')
  let oauth = 0, posts = 0
  const keys: string[] = []
  globalThis.fetch = (async (url, init) => {
    if (String(url).includes('/oauth/')) { oauth++; await new Promise(r => setTimeout(r, 15)); return Response.json({ access_token:'fixture-shared-token', expires_in:3600 }) }
    posts++; keys.push(new Headers(init?.headers).get('idempotency-key')!)
    return Response.json({ session_id:'fixture-session',session_url:'https://checkout.teya.xyz/fixture' })
  }) as typeof fetch
  const results = await Promise.all([teyaProvider.createCheckout(input),teyaProvider.createCheckout({...input,idempotencyKey:'fixture-second-attempt'})])
  assert(results.every(r=>r.ok)); assert.equal(oauth,1); assert.equal(posts,2); assert.equal(new Set(keys).size,2)
  await teyaProvider.createCheckout(input); assert.equal(oauth,1)
})
test('expired and rejected OAuth tokens are reacquired without automatically retrying a checkout POST', async () => {
  const input = fixture('expiry')
  let oauth=0, posts=0
  globalThis.fetch=(async url=>{
    if(String(url).includes('/oauth/')){oauth++;return Response.json({access_token:'fixture-expiring',expires_in:1})}
    posts++;return Response.json({}, {status:401})
  }) as typeof fetch
  console.warn=()=>{}
  await teyaProvider.createCheckout(input); await teyaProvider.createCheckout(input)
  assert.equal(oauth,2);assert.equal(posts,2)
})
test('failed OAuth single-flight clears its promise so a later request can recover', async () => {
  const input=fixture('oauth-recovery');let oauth=0
  globalThis.fetch=(async url=>{
    if(String(url).includes('/oauth/')){if(++oauth===1)throw Error('private transport message');return Response.json({access_token:'fixture-recovered'})}
    return Response.json({session_id:'fixture-session',session_url:'https://checkout.teya.xyz/fixture'})
  }) as typeof fetch
  assert.equal((await teyaProvider.createCheckout(input)).ok,false)
  assert.equal((await teyaProvider.createCheckout(input)).ok,true);assert.equal(oauth,2)
})
