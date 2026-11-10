import assert from 'node:assert/strict'
import { createSign, generateKeyPairSync } from 'node:crypto'
import { afterEach, describe, it } from 'node:test'
import { teyaProvider, verifyTeyaRsaSignature } from './teya'

const saved = { ...process.env }

afterEach(() => {
  process.env = { ...saved }
})

describe('Teya sandbox client', () => {
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

  it('refuses production even when credentials are present', async () => {
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
