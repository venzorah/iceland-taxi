import test from 'node:test'
import assert from 'node:assert/strict'
import {loginDestination} from './login-destination'
const origin='https://example.test'
const customer={user:{role:'CUSTOMER'},staff:false,driver:false}
const driver={user:{role:'DRIVER'},staff:false,driver:true}
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
