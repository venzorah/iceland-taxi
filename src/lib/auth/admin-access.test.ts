import assert from 'node:assert/strict'
import test from 'node:test'

import { adminScreenAccess } from './admin-screen'

test('a driver without a staff session is blocked from admin', () => {
  assert.equal(adminScreenAccess({ staff: false, driver: true }), 'driver-blocked')
})

test('staff can open admin, including when no driver cookie is set', () => {
  assert.equal(adminScreenAccess({ staff: true, driver: false }), 'admin')
  assert.equal(adminScreenAccess({ staff: false, driver: false }), 'admin')
  assert.equal(adminScreenAccess({ staff: true, driver: true }), 'admin')
})
