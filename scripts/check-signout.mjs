// Local isolated test database only. Two disposable sessions verify real global revocation.
import env from '@next/env'
import {createFixtureIdentity,deleteFixtureIdentity,fixtureSession,closeFixtureAuth} from './fixture-auth.mjs'
import {randomUUID,randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
env.loadEnvConfig(process.cwd(),true)
const origin=process.argv[2]||'http://localhost:3000'
let identity
try{
 const email=`signout-check-${randomUUID()}@example.invalid`,password=randomBytes(32).toString('base64url')
 identity=(await createFixtureIdentity({email,password})).data.user.id
 const jars=[new Map(),new Map()]
 for(const jar of jars)assert.equal((await fixtureSession(origin,jar).signIn({email,password})).error,null)
 const cookies=jars.map(jar=>[...jar].map(([key,value])=>`${key}=${value}`).join('; '))
 const foreign=await fetch(origin+'/api/auth/signout',{method:'POST',headers:{Origin:'https://foreign.example',Cookie:cookies[0]}});assert.equal(foreign.status,403)
 const response=await fetch(origin+'/api/auth/signout',{method:'POST',headers:{Origin:new URL(origin).origin,Cookie:cookies[0]}})
 assert.equal(response.status,200)
 assert(response.headers.getSetCookie().some(value=>/iceland-taxi.session_token/.test(value)&&/Max-Age=0/i.test(value)))
 for(const cookie of cookies){const result=await fetch(origin+'/api/auth/get-session',{headers:{Cookie:cookie}});assert.equal(await result.json(),null)}
 console.log('Global signout, cookie expiry, copied-session revocation and foreign-origin rejection: passed.')
}finally{if(identity)await deleteFixtureIdentity(identity);await closeFixtureAuth()}
