import test from 'node:test'
import assert from 'node:assert/strict'
import { canViewAdminSection, initialAdminSection } from './admin-sections'
test('admin navigation mirrors server permissions and does not default to super admin',()=>{
  assert.equal(canViewAdminSection('DRIVER','bookings'),false)
  assert.equal(canViewAdminSection('CUSTOMER','staff'),false)
  assert.equal(canViewAdminSection('UNKNOWN','overview'),false)
  assert.equal(canViewAdminSection('STAFF','drivers'),true)
  assert.equal(canViewAdminSection('BOOKING_MANAGER','drivers'),true)
  assert.equal(canViewAdminSection('BOOKING_MANAGER','services'),false)
  assert.equal(canViewAdminSection('FINANCE_MANAGER','reports'),true)
  assert.equal(canViewAdminSection('FINANCE_MANAGER','messages'),false)
  assert.equal(canViewAdminSection('CONTENT_MANAGER','pages'),true)
  assert.equal(canViewAdminSection('CONTENT_MANAGER','library'),true)
  assert.equal(canViewAdminSection('FINANCE_MANAGER','library'),false)
  assert.equal(canViewAdminSection('STAFF','content'),false)
  assert.equal(canViewAdminSection('CONTENT_MANAGER','customers'),false)
  assert.equal(initialAdminSection('FINANCE_MANAGER'),'payments')
  assert.equal(initialAdminSection('CONTENT_MANAGER'),'services')
})
