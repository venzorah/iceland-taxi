import assert from 'node:assert/strict'
import test from 'node:test'
import { apiHandler, withDb } from './api'
test('database failures return 503 with Retry-After and never fall back to sample success', async () => {
  const previous = process.env.DATABASE_URL
  process.env.DATABASE_URL = previous || 'postgresql://placeholder'
  let fallback = false
  try {
    const handler = apiHandler(async () => {
      await withDb(async () => { throw Object.assign(new Error('private connection details'), { code: 'P2024' }) }, () => { fallback = true; return [] })
      return new Response('unexpected success')
    })
    const response = await handler()
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('Retry-After'), '30')
    assert.equal(fallback, false)
    const body = await response.json()
    assert.equal(body.code, 'DATABASE_UNAVAILABLE')
    assert.equal(JSON.stringify(body).includes('private connection details'), false)
  } finally { if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous }
})
