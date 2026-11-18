import test from 'node:test'
import assert from 'node:assert/strict'
import {loginDestination} from './login-destination'
import {portalNavigation} from './portal-navigation'
const origin='https://example.test'
const customer={user:{role:'CUSTOMER'},staff:false,driver:false}
const driver={user:{role:'DRIVER'},staff:false,driver:true}
test('staff sessions always link to their own portal, including on customer pages',()=>{
 for (const role of ['SUPER_ADMIN','BOOKING_MANAGER','FINANCE_MANAGER','CONTENT_MANAGER','STAFF']) {
  const session={user:{role},staff:true,driver:false}
  assert.equal(portalNavigation(role).href,'/admin')
  assert.equal(portalNavigation(role).label,'Admin portal')
  assert.equal(loginDestination(session,'/account',origin),'/admin')
  assert.equal(loginDestination(session,'/book',origin),'/admin')
  assert.equal(loginDestination({...session,staff:false},null,origin),null)
 }
 assert.equal(portalNavigation('DRIVER').label,'Driver portal')
 assert.equal(portalNavigation('CUSTOMER').label,'My account')
 assert.equal(portalNavigation(undefined).href,'/login')
 assert.equal(loginDestination({user:{role:'UNRECOGNIZED'},staff:false,driver:false},null,origin),null)
})
test('verified drivers reach their portal from generic sign-in or driver sign-in',()=>{
 assert.equal(loginDestination(driver,null,origin),'/driver')
 assert.equal(loginDestination(driver,'/account',origin,true),'/driver')
 assert.equal(loginDestination(driver,'/driver',origin,true),origin+'/driver')
})
test('selecting driver sign-in cannot grant customer accounts driver access',()=>{
 assert.equal(loginDestination(customer,'/driver',origin,true),null)
 assert.equal(loginDestination(customer,'/driver',origin),'/account')
 assert.equal(loginDestination({user:null,staff:false,driver:false},null,origin),null)
})
test('redirects preserve authorized destinations and reject external or cross-role paths',()=>{
 assert.equal(loginDestination(customer,'/book?ref=TEST',origin),origin+'/book?ref=TEST')
 assert.equal(loginDestination(customer,'https://evil.example/account',origin),'/account')
 assert.equal(loginDestination(driver,'//evil.example/driver',origin),'/driver')
 assert.equal(loginDestination(customer,'/accounting',origin),'/account')
 assert.equal(loginDestination({user:{role:'SUPER_ADMIN'},staff:true,driver:false},null,origin),'/admin')
})
