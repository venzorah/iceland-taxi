// Full HTTP acceptance. Requires the isolated fixture app + fixture-only SMTP sink from the runbook.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PrismaClient} from '@prisma/client'
import {randomUUID} from 'node:crypto'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const origin=process.env.AUTH_TEST_ORIGIN,connection=process.env.DIRECT_URL
if(!origin||!connection)throw new Error('Explicit fixture origin and database required')
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname)||!['127.0.0.1','localhost'].includes(new URL(connection).hostname)||new URL(connection).pathname!=='/iceland_taxi_rehearsal')throw new Error('Isolated loopback rehearsal required')
const db=new PrismaClient({datasourceUrl:connection,log:[]}),marker=randomUUID(),jars=new Map(),ids=[]
const email=`http-customer-${marker}@example.invalid`,driverEmail=`http-driver-${marker}@example.invalid`,changedEmail=`http-changed-${marker}@example.invalid`
const oldPassword='Original HTTP fixture password!',newPassword='Changed HTTP fixture password!'
async function request(path,body,actor='customer'){
 const jar=jars.get(actor)||new Map();jars.set(actor,jar)
 const response=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:origin,'x-real-ip':actor==='driver'?'2001:db8::a01':'2001:db8::a02',Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(30000)})
 for(const header of response.headers.getSetCookie()){const pair=header.split(';')[0],index=pair.indexOf('=');jar.set(pair.slice(0,index),pair.slice(index+1))}
 return response
}
async function latestLink(to){
 const messages=JSON.parse(await readFile(join(tmpdir(),'itb-auth-smtp-messages.json'),'utf8'))
 const raw=messages.filter(text=>text.includes('To: '+to)).at(-1);assert(raw,'SMTP message must arrive at the sink')
 const decoded=raw.replace(/=\n/g,'').replace(/=([a-f0-9]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16)))
 const url=decoded.match(/https?:\/\/[^\s<>"']+/)?.[0]?.replaceAll('&amp;','&');assert(url)
 assert.equal(new URL(url).origin,origin);return url
}
async function follow(to,actor='customer'){const url=new URL(await latestLink(to));return request(url.pathname+url.search,undefined,actor)}
try{
 const driver=await db.user.create({data:{email:driverEmail,name:'Provisioned HTTP driver',role:'DRIVER',driver:{create:{displayName:'HTTP driver fixture',active:true}}}});ids.push(driver.id)
 for(const [actor,address]of [['customer',email],['driver',driverEmail]]){
  const signup=await request('/api/auth/sign-up/email',{email:address,password:oldPassword,name:'HTTP fixture',role:'SUPER_ADMIN',callbackURL:'/auth/confirm'},actor)
  assert.equal(signup.status,200)
  const early=await request('/api/auth/sign-in/email',{email:address,password:oldPassword},actor);assert.equal(early.status,403)
  assert((await follow(address,actor)).status<400)
  assert.equal((await request('/api/auth/sign-in/email',{email:address,password:oldPassword},actor)).status,200)
  const session=await(await request('/api/auth/session',undefined,actor)).json()
  assert.equal(session.user.role,actor==='driver'?'DRIVER':'CUSTOMER')
  if(actor==='driver')assert.equal(session.user.id,driver.id);else ids.push(session.user.id)
 }
 assert.equal((await request('/api/admin/workspace')).status,403)
 assert.equal((await(await request('/api/driver/me',undefined,'driver')).json()).authenticated,true)
 console.log('HTTP signup → real SMTP sink → verification → sign-in; customer default and provisioned driver ID/role: passed')
 assert.equal((await request('/api/account/security',{currentPassword:'wrong',password:newPassword})).status,400)
 assert.equal((await request('/api/auth/change-email',{newEmail:changedEmail,callbackURL:'/auth/confirm'})).status,403)
 assert.equal((await request('/api/account/security',{currentPassword:oldPassword,password:newPassword})).status,200)
 assert.equal((await request('/api/account/security',{currentPassword:newPassword,email:driverEmail})).status,400)
 assert.equal((await request('/api/account/security',{currentPassword:newPassword,email:changedEmail})).status,200)
 assert.equal((await(await request('/api/auth/session')).json()).user.email,email)
 assert((await follow(email)).status<400)
 assert((await follow(changedEmail)).status<400)
 const updated=await(await request('/api/auth/session')).json();assert.equal(updated.user.email,changedEmail);assert.equal(updated.user.id,ids[1]);assert.equal(updated.user.role,'CUSTOMER')
 assert.equal((await db.user.findUniqueOrThrow({where:{id:ids[1]}})).email,changedEmail)
 console.log('HTTP current-password enforcement, password update, email collision guard, old/new-address SMTP confirmation and stable business ID: passed')
 const ready=await request('/api/health/ready');assert.equal(ready.status,200)
 console.log('Database readiness under runtime RLS: passed')
}finally{
 await db.user.deleteMany({where:{id:{in:ids}}})
 await db.authIdentity.deleteMany({where:{email:{in:[email,driverEmail,changedEmail]}}})
 await db.$disconnect()
}
