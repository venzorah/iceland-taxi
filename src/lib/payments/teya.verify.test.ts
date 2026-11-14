import assert from 'node:assert/strict'
import { createSign, generateKeyPairSync } from 'node:crypto'
import { afterEach, describe, it } from 'node:test'
import { teyaProvider, verifyTeyaRsaSignature, paymentEnvironmentMatches, teyaSessionSnapshot } from './teya'

const saved = { ...process.env }

afterEach(() => {
  process.env = { ...saved }
})

describe('Teya hosted checkout', () => {
  it('verifies an RSA-SHA256 webhook signature and rejects a tampered body', () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const body = JSON.stringify({ type: 'payment.succeeded.v1', data: { session_id: 's1' } })
    const signature = createSign('RSA-SHA256').update(body).end().sign(privateKey).toString('base64')

    assert.equal(verifyTeyaRsaSignature(body, signature, pem).ok, true)
    assert.equal(verifyTeyaRsaSignature(body + ' ', signature, pem).ok, false)
    assert.equal(verifyTeyaRsaSignature(body, signature, undefined).ok, false)
  })

  it('does not call Teya when sandbox credentials are missing', async () => {
    delete process.env.TEYA_CLIENT_ID
    delete process.env.TEYA_CLIENT_SECRET
    delete process.env.TEYA_STORE_ID
    delete process.env.TEYA_MERCHANT_ID
    delete process.env.TEYA_API_KEY
    process.env.TEYA_ENVIRONMENT = 'sandbox'
    let calls = 0
    const original = globalThis.fetch
    globalThis.fetch = (async () => {
      calls += 1
      throw new Error('fetch should not run')
    }) as typeof fetch
    try {
      const result = await teyaProvider.createCheckout({
        bookingRef: 'ITB-TEST',
        amount: 153,
        currency: 'EUR',
        description: 'Airport transfer',
        returnUrl: 'https://example.test/return',
        cancelUrl: 'https://example.test/cancel',
      })
      assert.equal(result.ok, false)
      if (!result.ok) assert.equal(result.code, 'MISSING_CREDENTIALS')
      assert.equal(calls, 0)
    } finally {
      globalThis.fetch = original
    }
  })

  it('does not call live endpoints without secure application origin and webhook configuration', async () => {
    process.env.TEYA_CLIENT_ID = 'merchant-test'
    process.env.TEYA_CLIENT_SECRET = 'secret-test'
    process.env.TEYA_STORE_ID = 'store-test'
    process.env.TEYA_ENVIRONMENT = 'production'
    let calls = 0
    const original = globalThis.fetch
    globalThis.fetch = (async () => {
      calls += 1
      throw new Error('live host must not be called')
    }) as typeof fetch
    try {
      const result = await teyaProvider.createCheckout({
        bookingRef: 'ITB-TEST',
        amount: 5000,
        currency: 'ISK',
        description: 'Airport transfer',
        returnUrl: 'https://example.test/return',
        cancelUrl: 'https://example.test/cancel',
      })
      assert.equal(result.ok, false)
      if (!result.ok) assert.equal(result.code, 'VALIDATION_ERROR')
      assert.equal(calls, 0)
    } finally {
      globalThis.fetch = original
    }
  })
})

const checkoutInput={bookingRef:'ITB-MOCK',amount:153,currency:'EUR' as const,description:'Airport transfer',returnUrl:'https://merchant.example/return',cancelUrl:'https://merchant.example/cancel',idempotencyKey:'fixture-attempt'}
it('routes checkout and status lookups to the selected environment without sharing tokens',async()=>{
  const original=globalThis.fetch
  const calls:{url:string;init?:RequestInit}[]=[]
  process.env.TEYA_CLIENT_ID='routing-fixture';process.env.TEYA_CLIENT_SECRET='routing-secret';process.env.TEYA_STORE_ID='routing-store';process.env.TEYA_WEBHOOK_PUBLIC_KEY='public-key-fixture';process.env.NEXT_PUBLIC_APP_URL='https://merchant.example'
  globalThis.fetch=(async(input,init)=>{
    const url=String(input);calls.push({url,init})
    if(url.includes('/oauth/'))return Response.json({access_token:url.includes('.xyz')?'sandbox-token':'production-token',expires_in:3600})
    const live=url.startsWith('https://api.teya.com/')
    assert.equal(new Headers(init?.headers).get('authorization'),`Bearer ${live?'production':'sandbox'}-token`)
    if(init?.method==='POST'){
      const payload=JSON.parse(String(init.body));assert.deepEqual(payload.amount,{value:15300,currency:'EUR'})
      assert.equal(payload.store_id,'routing-store');assert.equal(new Headers(init.headers).get('idempotency-key'),'fixture-attempt')
      return Response.json({session_id:'fixture-session',session_url:`https://checkout.teya.${live?'com':'xyz'}/session/fixture-session`})
    }
    return Response.json({session_id:'fixture-session',session_status:'COMPLETED',payment_status:'SUCCESS'})
  }) as typeof fetch
  try{
    for(const environment of ['sandbox','production'] as const){
      process.env.TEYA_ENVIRONMENT=environment
      assert.equal(teyaProvider.isConfigured(),true)
      assert.equal((await teyaProvider.createCheckout(checkoutInput)).ok,true)
      const looked=await teyaProvider.lookupSession('fixture-session');assert.equal(looked.ok,true)
    }
    assert.deepEqual(calls.filter(c=>c.url.includes('/oauth/')).map(c=>c.url),['https://id.teya.xyz/oauth/v2/oauth-token','https://id.teya.com/oauth/v2/oauth-token'])
    assert(calls.every(c=>c.init?.redirect==='error'&&c.init.signal))
  }finally{globalThis.fetch=original}
})
it('blocks foreign return URLs and unsafe live checkout redirects',async()=>{
  const original=globalThis.fetch
  process.env.TEYA_CLIENT_ID='unsafe-fixture';process.env.TEYA_CLIENT_SECRET='secret';process.env.TEYA_STORE_ID='store';process.env.TEYA_WEBHOOK_PUBLIC_KEY='key';process.env.TEYA_ENVIRONMENT='production';process.env.NEXT_PUBLIC_APP_URL='https://merchant.example'
  let calls=0
  globalThis.fetch=(async(input)=>{calls++;return String(input).includes('/oauth/')?Response.json({access_token:'mock-token'}):Response.json({session_id:'fixture-session',session_url:'https://evil.example/pay'})}) as typeof fetch
  try{assert.equal((await teyaProvider.createCheckout({...checkoutInput,cancelUrl:'https://evil.example'})).ok,false);assert.equal(calls,0);assert.equal((await teyaProvider.createCheckout(checkoutInput)).ok,false)}finally{globalThis.fetch=original}
})
it('historical sandbox sessions cannot be reused as live payments',()=>{
 assert.equal(paymentEnvironmentMatches(null,'production'),false)
 assert.equal(paymentEnvironmentMatches({environment:'sandbox'},'production'),false)
 const failed=teyaSessionSnapshot({environment:'production'},{payment_status:'FAILED'})
 assert.equal(paymentEnvironmentMatches(failed,'production'),true)
 assert.equal(paymentEnvironmentMatches(teyaSessionSnapshot(failed,{payment_status:'SUCCESS'}),'production'),true)
 assert.equal(paymentEnvironmentMatches({environment:'production'},'production'),true)
 assert.equal(paymentEnvironmentMatches(null,'sandbox'),true)
})
