import assert from 'node:assert/strict'
import test from 'node:test'
import { canUseAdminModule } from './permissions'

test('only super admin can manage staff and roles', () => {
  assert.equal(canUseAdminModule('SUPER_ADMIN', 'staff'), true)
  for (const role of ['CUSTOMER', 'DRIVER', 'STAFF', 'BOOKING_MANAGER', 'FINANCE_MANAGER', 'CONTENT_MANAGER']) {
    assert.equal(canUseAdminModule(role, 'staff'), false)
  }
})
test('operational, finance, and content roles stay within assigned modules', () => {
  assert.equal(canUseAdminModule('BOOKING_MANAGER', 'bookings'), true)
  assert.equal(canUseAdminModule('CONTENT_MANAGER', 'editorial'), true)
  assert.equal(canUseAdminModule('CONTENT_MANAGER', 'customers'), false)
  assert.equal(canUseAdminModule('FINANCE_MANAGER', 'payments'), true)
  assert.equal(canUseAdminModule('STAFF', 'payments'), false)
  assert.equal(canUseAdminModule('DRIVER', 'bookings'), false)
  assert.equal(canUseAdminModule('CUSTOMER', 'customers'), false)
})
