import test from 'node:test'
import assert from 'node:assert/strict'
import {planIdentityImport,type SourceIdentity,type BusinessIdentity} from './import-plan'
const timestamp=new Date('2025-01-01T12:00:00Z')
const source:SourceIdentity={id:'source-uuid',email:'person@example.invalid',email_confirmed_at:timestamp,encrypted_password:'$2b$10$'+'a'.repeat(53),created_at:timestamp,updated_at:timestamp,banned_until:null,deleted_at:null,is_anonymous:false,providers:['email']}
const app:BusinessIdentity={id:'original-business-cuid',authId:source.id,email:source.email!,name:'Original name',role:'SUPER_ADMIN',createdAt:timestamp,updatedAt:timestamp}
test('preserves source identity, business mapping, credential hash and timestamps',()=>{
 const [plan]=planIdentityImport([source],[app],[app])
 assert.equal(plan.id,source.id);assert.equal(plan.appUserId,app.id);assert.equal(plan.password,source.encrypted_password)
 assert.equal(plan.createdAt,source.created_at);assert.equal(plan.updatedAt,source.updated_at);assert.equal(plan.resetRequired,false)
 assert.equal(app.role,'SUPER_ADMIN')
})
test('unsupported passwords become reset exceptions without losing verified accounts',()=>{
 const [plan]=planIdentityImport([{...source,encrypted_password:'legacy-unsupported'}],[app],[app])
 assert.equal(plan.password,null);assert.equal(plan.resetRequired,true);assert.equal(plan.emailVerified,true);assert.equal(plan.appUserId,app.id)
})
test('auth-only users are retained without granting business roles',()=>{
 const [plan]=planIdentityImport([source],[],[])
 assert.equal(plan.appUserId,null);assert.equal('role' in plan,false)
})
test('disabled/deleted accounts remain disabled and unconfirmed accounts stay unconfirmed',()=>{
 const [plan]=planIdentityImport([{...source,deleted_at:timestamp,email_confirmed_at:null}],[app],[app])
 assert.equal(plan.disabled,true);assert.equal(plan.emailVerified,false)
})
test('aborts for source duplicates, unsupported providers and broken restored mappings',()=>{
 assert.throws(()=>planIdentityImport([source,source],[app],[app]),/DUPLICATE/)
 assert.throws(()=>planIdentityImport([{...source,providers:['github']}],[app],[app]),/UNSUPPORTED/)
 assert.throws(()=>planIdentityImport([source],[app],[{...app,role:'CUSTOMER'}]),/RESTORE_MISMATCH/)
 assert.throws(()=>planIdentityImport([],[app],[app]),/MISSING_SOURCE/)
})
test('rejects privileged-email collisions instead of reassigning identities',()=>{
 const other={...app,id:'another-cuid',authId:'other-uuid',email:'other@example.invalid'}
 assert.throws(()=>planIdentityImport([{...source,email:other.email},{...source,id:other.authId,email:app.email}],[app,other],[app,other]),/COLLISION/)
})
