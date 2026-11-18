// Acceptance test for the synthetic PostgreSQL fixture described in auth-transition.md.
// Never runs against Supabase or a production database; no real email/payment transport is used.
import assert from 'node:assert/strict'
import {PrismaClient} from '@prisma/client'
import {prismaAdapter} from 'better-auth/adapters/prisma'
import {createAuthentication} from '../../src/lib/auth/config'
import {supportedBcrypt} from '../../src/lib/auth/password'

async function main(){
 const value=process.env.AUTH_TEST_DATABASE_URL
 if(!value)throw new Error('AUTH_TEST_DATABASE_URL_REQUIRED')
 const url=new URL(value)
 if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/iceland_taxi_rehearsal')throw new Error('SYNTHETIC_LOOPBACK_FIXTURE_REQUIRED')
 const db=new PrismaClient({datasourceUrl:value,log:[]}),links:{to:string;url:string}[]=[]
 const base='http://127.0.0.1:3199'
 const auth=createAuthentication({database:prismaAdapter(db,{provider:'postgresql',transaction:true}),baseURL:base,secret:'acceptance-fixture-signing-secret-is-not-a-real-secret',proxyHeader:'x-real-ip',isDisabled:async id=>Boolean((await db.authIdentity.findUnique({where:{id}}))?.disabled),sendLink:async(to,_subject,url)=>{links.push({to,url})}})
 let ip=1
 async function request(path:string,body?:unknown,cookie='',origin=base){
  return auth.handler(new Request(base+'/api/auth'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie,'x-real-ip':`192.0.2.${ip++}`},body:body===undefined?undefined:JSON.stringify(body)}))
 }
 function cookie(response:Response){return response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ')}
 async function signIn(email:string,password='Preserved fixture password!'){
  const result=await request('/sign-in/email',{email,password});assert.equal(result.status,200,'Preserved-password sign-in');assert(cookie(result));return cookie(result)
 }
 async function followLink(link:string,session=''){return auth.handler(new Request(link,{headers:{Cookie:session,Origin:base}}))}
 try{
  assert(await db.user.findUnique({where:{id:'original-user-1'}}),'Synthetic imported fixture required')
  const before=await db.$queryRaw`SELECT row_to_json(u)::text AS record FROM "User" u ORDER BY id`
  const originalHash=(await db.authAccount.findFirstOrThrow({where:{userId:'11111111-1111-4111-8111-000000000001'}})).password
  assert(originalHash&&supportedBcrypt(originalHash))
  const first=await signIn('migrated-1@example.invalid'),second=await signIn('migrated-1@example.invalid')
  assert.equal((await request('/sign-in/email',{email:'migrated-1@example.invalid',password:'wrong'})).status,401)
  const current=await (await request('/get-session',undefined,first)).json()
  assert.equal(current.user.id,'11111111-1111-4111-8111-000000000001');assert.equal(current.user.appUserId,undefined);assert.equal(current.user.disabled,undefined)
  assert.equal((await db.authAccount.findFirstOrThrow({where:{userId:current.user.id}})).password,originalHash)
  for(const email of ['migrated-5@example.invalid','migrated-6@example.invalid'])assert((await request('/sign-in/email',{email,password:'Preserved fixture password!'})).status>=400)
  assert.equal((await request('/sign-in/email',{email:'migrated-1@example.invalid',password:'Preserved fixture password!'},'','https://foreign.example')).status,403)
  console.log('Preserved bcrypt password, wrong password, confirmation/disabled gates, private custom fields and CSRF: passed')

  const forgedSignup=await request('/sign-up/email',{email:'new-signup@example.invalid',password:'New signup fixture password!',name:'New fixture',appUserId:'original-user-2',disabled:false,callbackURL:'/auth/confirm'})
  assert.equal(forgedSignup.status,400,'Server-only fields must be rejected')
  const signup=await request('/sign-up/email',{email:'new-signup@example.invalid',password:'New signup fixture password!',name:'New fixture',role:'SUPER_ADMIN',callbackURL:'/auth/confirm'})
  assert.equal(signup.status,200,'Signup');assert.equal((await signup.json()).token,null)
  const identity=await db.authIdentity.findUniqueOrThrow({where:{email:'new-signup@example.invalid'}})
  assert.equal(identity.appUserId,null);assert.equal(identity.emailVerified,false)
  assert.equal((await request('/sign-in/email',{email:identity.email,password:'New signup fixture password!'})).status,403)
  const verification=links.find(link=>link.to===identity.email);assert(verification)
  assert((await followLink(verification.url)).status<400)
  assert.equal((await db.authIdentity.findUniqueOrThrow({where:{id:identity.id}})).emailVerified,true)
  await signIn(identity.email,'New signup fixture password!')
  console.log('Signup, server-only linking fields and verification-before-sign-in: passed')

  const unknown=await request('/request-password-reset',{email:'unknown@example.invalid',redirectTo:'/login?mode=update'})
  const reset=await request('/request-password-reset',{email:'migrated-1@example.invalid',redirectTo:'/login?mode=update'})
  assert.equal(unknown.status,200);assert.equal(reset.status,200);assert.deepEqual(await unknown.json(),await reset.json())
  const resetLink=links.filter(link=>link.to==='migrated-1@example.invalid').at(-1);assert(resetLink)
  const resetRedirect=await followLink(resetLink.url),resetURL=new URL(resetRedirect.headers.get('location')!)
  const token=resetURL.searchParams.get('token');assert(token)
  const changed=await request('/reset-password',{token,newPassword:'New reset fixture password!'});assert.equal(changed.status,200)
  assert.equal((await request('/reset-password',{token,newPassword:'Another fixture password!'})).status,400)
  for(const session of [first,second])assert.equal(await (await request('/get-session',undefined,session)).json(),null)
  const newHash=(await db.authAccount.findFirstOrThrow({where:{userId:current.user.id}})).password;assert(newHash&&!supportedBcrypt(newHash))
  const renewed=await signIn('migrated-1@example.invalid','New reset fixture password!')
  assert.equal((await request('/sign-in/email',{email:'migrated-1@example.invalid',password:'Preserved fixture password!'})).status,401)
  console.log('Generic recovery response, single-use reset token, scrypt replacement and all-session revocation: passed')

  const exception=await request('/request-password-reset',{email:'migrated-4@example.invalid',redirectTo:'/login?mode=update'});assert.equal(exception.status,200)
  const exceptionLink=links.filter(link=>link.to==='migrated-4@example.invalid').at(-1);assert(exceptionLink)
  const exceptionToken=new URL((await followLink(exceptionLink.url)).headers.get('location')!).searchParams.get('token')
  assert.equal((await request('/reset-password',{token:exceptionToken,newPassword:'Exception reset fixture password!'})).status,200)
  await signIn('migrated-4@example.invalid','Exception reset fixture password!')
  console.log('Unsupported imported password recovers through a private reset link: passed')

  await auth.api.changeEmail({headers:new Headers({Cookie:renewed}),body:{newEmail:'changed@example.invalid',callbackURL:'/auth/confirm'}})
  const approval=links.filter(link=>link.to==='migrated-1@example.invalid').at(-1);assert(approval)
  assert.equal((await db.authIdentity.findUniqueOrThrow({where:{id:current.user.id}})).email,'migrated-1@example.invalid')
  await followLink(approval.url,renewed)
  const confirmNew=links.find(link=>link.to==='changed@example.invalid');assert(confirmNew)
  await followLink(confirmNew.url,renewed)
  assert.equal((await db.authIdentity.findUniqueOrThrow({where:{id:current.user.id}})).email,'changed@example.invalid')
  const after=await db.$queryRaw`SELECT row_to_json(u)::text AS record FROM "User" u ORDER BY id`
  assert.deepEqual(after,before,'Authentication never rewrites application IDs/roles/timestamps')
  console.log('Current-email approval and new-email verification: passed; original business records unchanged')

  let denied=false
  try{await db.$executeRawUnsafe('CREATE TABLE public.runtime_must_not_create (id integer)')}catch{denied=true}
  assert(denied,'Runtime must not create schema objects')
  denied=false;try{await db.$executeRawUnsafe('UPDATE public._prisma_migrations SET checksum=checksum')}catch{denied=true}
  assert(denied,'Runtime must not edit migration history')
  console.log('Unprivileged runtime RLS/DML works; schema changes and migration-history writes are denied')
 }finally{await db.$disconnect()}
}
void main().catch((error:Error)=>{console.error('Authentication acceptance failed:',error.name,error.message.startsWith('Prisma')?'database operation failed':error.message);process.exitCode=1})
