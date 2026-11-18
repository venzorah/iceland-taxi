import {createFixtureIdentity,deleteFixtureIdentity,fixtureSession,closeFixtureAuth} from './fixture-auth.mjs'
// Isolated browser checks; no signup emails, security updates, payments or outbound notifications.
import nextEnv from '@next/env'
import {PrismaClient} from '@prisma/client'
import {randomUUID,randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
import {verifyCustomerBrowser} from './customer-browser-check.mjs'
nextEnv.loadEnvConfig(process.cwd())
const origin=process.argv[2]||'http://127.0.0.1:3109',debug=process.env.CHROME_DEBUG_URL
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname)||!debug)throw new Error('An isolated local server and browser are required')
const url=new URL(process.env.DIRECT_URL||process.env.DATABASE_URL);url.searchParams.set('connection_limit','1');url.searchParams.set('connect_timeout','30');url.searchParams.set('pool_timeout','40')
const db=new PrismaClient({datasourceUrl:url.toString()}),accounts=[],run=randomUUID()
async function account(role){
 const email=`ux-${role.toLowerCase()}-${run}@example.invalid`,password=randomBytes(32).toString('base64url')
 const result=await createFixtureIdentity({email,password,email_confirm:true});if(result.error)throw new Error('Temporary identity creation failed')
 const a={identity:result.data.user.id,email,jar:new Map()};accounts.push(a)
 a.user=await db.user.create({data:{email,role,authId:a.identity,name:'Temporary verification account',...(role==='DRIVER'?{driver:{create:{displayName:'Temporary driver'}}}:{})}})
 const client=fixtureSession(origin, a.jar)
 if((await client.signIn({email,password})).error)throw new Error('Temporary sign-in failed')
 return a
}
async function loginBrowser(customer,driver){
 const page=await fetch(`${debug}/json/new?about:blank`,{method:'PUT'}).then(r=>r.json()),ws=new WebSocket(page.webSocketDebuggerUrl)
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
 let id=0;const pending=new Map()
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(!m.id)return;const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)})
 const call=(method,params={})=>new Promise((resolve,reject)=>{const seq=++id;pending.set(seq,{resolve,reject});ws.send(JSON.stringify({id:seq,method,params}))})
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error('Browser evaluation failed');return r.result.value}
 const wait=async expression=>{const end=Date.now()+90000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,500))}throw new Error('Login browser state timed out')}
 const cookies=async a=>{await call('Network.clearBrowserCookies');await call('Network.setCookies',{cookies:[...a.jar].map(([name,value])=>({name,value,url:origin,path:'/',sameSite:'Lax'}))})}
 try{
  await call('Network.enable');await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await call('Page.navigate',{url:origin+'/'})
  await wait("!!document.querySelector('#driver-access-title')")
  assert.equal(await evaluate("[...document.querySelectorAll('#driver-access-title + p')].length>0"),true)
  assert.equal(await evaluate("[...document.querySelectorAll('a')].some(a=>a.textContent==='Driver sign in'&&a.href.includes('portal=driver'))"),true)
  await call('Page.navigate',{url:origin+'/login?portal=driver&next=/driver'})
  await wait("document.querySelector('h1')?.textContent==='Driver sign in'")
  assert.equal(await evaluate("document.querySelector('input[type=email]').placeholder"),'you@example.com')
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Activate driver account').click()")
  await wait("document.querySelector('h1')?.textContent==='Activate driver sign-in'")
  assert.equal(await evaluate("document.querySelector('input[autocomplete=name]').placeholder"),'Enter your full name')
  await evaluate("document.querySelector('[aria-label=\"Show password\"]').click()")
  assert.equal(await evaluate("document.querySelector('#auth-password').type"),'text')
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Sign in').click()")
  assert.equal(await evaluate("document.querySelector('#auth-password').type"),'password')
  await cookies(customer)
  await call('Page.navigate',{url:origin+'/login?portal=driver&next=/driver&complete=1'})
  await wait("[...document.querySelectorAll('button')].some(b=>b.textContent==='Continue to your account')")
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Continue to your account').click()")
  await wait("document.body.innerText.includes('This account does not have driver access')")
  assert.equal(await evaluate('location.pathname'),'/login')
  await cookies(driver)
  await call('Page.navigate',{url:origin+'/login?complete=1'})
  await wait("[...document.querySelectorAll('button')].some(b=>b.textContent==='Continue to your account')")
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Continue to your account').click()")
  await wait("location.pathname==='/driver' && document.body.innerText.includes('No assigned journeys')")
  console.log('Browser: homepage driver entry, activation labels/placeholders, password reset-on-mode-change, customer denial and real driver routing: PASS')
 }finally{ws.close();await fetch(`${debug}/json/close/${page.id}`).catch(()=>{})}
}
try{const customer=await account('CUSTOMER'),driver=await account('DRIVER');await verifyCustomerBrowser(customer.jar,origin);await loginBrowser(customer,driver)}
catch(error){console.error('Profile/driver UX verification failed:',error.stack);process.exitCode=1}
finally{for(const a of accounts){if((await deleteFixtureIdentity(a.identity)).error){console.error('Temporary Auth cleanup needs retry');process.exitCode=1}await db.user.deleteMany({where:{email:a.email}})}await closeFixtureAuth();await db.$disconnect();console.log('Temporary UX verification accounts removed.')}
