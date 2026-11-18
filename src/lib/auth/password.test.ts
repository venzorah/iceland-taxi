import test from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import {hashAccountPassword,supportedBcrypt,verifyAccountPassword} from './password'

test('imported bcrypt variants verify without rewriting the hash',async()=>{
 const hash=await bcrypt.hash('Existing fixture password',4)
 for(const prefix of ['$2a$','$2b$','$2y$']){
  const imported=prefix+hash.slice(4)
  assert(supportedBcrypt(imported))
  assert.equal(await verifyAccountPassword({hash:imported,password:'Existing fixture password'}),true)
  assert.equal(await verifyAccountPassword({hash:imported,password:'incorrect'}),false)
 }
})
test('new/reset passwords use scrypt and malformed hashes fail closed',async()=>{
 const hash=await hashAccountPassword('New fixture password')
 assert.equal(supportedBcrypt(hash),false)
 assert(await verifyAccountPassword({hash,password:'New fixture password'}))
 assert.equal(await verifyAccountPassword({hash,password:'wrong'}),false)
 assert.equal(await verifyAccountPassword({hash:'unsupported hash',password:'any'}),false)
})
