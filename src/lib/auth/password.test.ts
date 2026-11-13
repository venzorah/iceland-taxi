import assert from 'node:assert/strict'
import test from 'node:test'

import { hashPassword, verifyPassword } from './password'

test('a stored driver password matches only the same password', async () => {
  const stored = await hashPassword('harbour-road')
  assert.equal(await verifyPassword('harbour-road', stored), true)
  assert.equal(await verifyPassword('other-road', stored), false)
  assert.equal(await verifyPassword('harbour-road', 'plain-text'), false)
})
