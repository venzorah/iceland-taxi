import test from 'node:test'
import assert from 'node:assert/strict'
import {endSession} from './sign-out'
test('sign-out invalidates the real session and reports HTTP failures',async()=>{
 const original=globalThis.fetch;let failing=false
 globalThis.fetch=async(input,init)=>{assert.equal(input,'/api/auth/signout');assert.equal(init?.method,'POST');return new Response(null,{status:failing?503:200})}
 try{await endSession();failing=true;await assert.rejects(()=>endSession(),/Could not sign out/)}finally{globalThis.fetch=original}
})
