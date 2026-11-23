import assert from 'node:assert/strict'
import test from 'node:test'
import { canViewAdminSection } from './admin-sections'
import { canUseAdminModule } from './permissions'

const sections = ['overview', 'bookings', 'enquiries', 'contacts', 'messages', 'drivers', 'vehicles', 'services', 'routes', 'pricing', 'destinations', 'customers', 'payments', 'reports', 'reviews', 'announcements', 'content', 'library', 'pages', 'seo', 'languages', 'staff', 'appearance', 'settings']
const modules = ['staff', 'payments', 'pricing', 'services', 'routes', 'destinations', 'editorial', 'seo', 'theme', 'company', 'drivers', 'vehicles', 'customers', 'enquiries', 'reminders', 'notifications', 'bookings']

test('super admin can open every admin section and perform every staff role', () => {
  for (const section of sections) assert.equal(canViewAdminSection('SUPER_ADMIN', section), true)
  for (const module of modules) assert.equal(canUseAdminModule('SUPER_ADMIN', module), true)
  for (const role of ['BOOKING_MANAGER', 'FINANCE_MANAGER', 'CONTENT_MANAGER', 'STAFF']) {
    for (const module of modules) {
      if (canUseAdminModule(role, module)) assert.equal(canUseAdminModule('SUPER_ADMIN', module), true)
    }
  }
})

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
