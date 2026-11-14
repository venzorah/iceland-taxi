import assert from 'node:assert/strict'
import test from 'node:test'
import {contactSchema} from './schema'
const valid={requestKey:'3ba6ba85-83d5-4fea-9979-8d853df09432',name:' Test customer ',email:'CUSTOMER@example.invalid',topic:'Other',body:'Please contact me about a journey.'}
test('contact messages validate content and reject bots or client-supplied status',()=>{
 const input=contactSchema.parse(valid)
 assert.equal(input.name,'Test customer');assert.equal(input.email,'customer@example.invalid')
 for(const changes of [{website:'https://spam.example'},{status:'CLOSED'},{body:'short'},{email:'invalid'},{requestKey:'invalid'},{body:'x'.repeat(4001)}])assert.equal(contactSchema.safeParse({...valid,...changes}).success,false)
})
