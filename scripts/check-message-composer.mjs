// Local browser layout checks. Auth uses temporary accounts; all browser APIs are mocked.
// No messages, bookings, payments or notifications are sent to real application APIs.
import env from '@next/env'
import {PrismaClient} from '@prisma/client'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
import {randomUUID,randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
env.loadEnvConfig(process.cwd())
const origin=process.argv[2]||'http://127.0.0.1:3110',debug=process.env.CHROME_DEBUG_URL
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname)||!debug)throw new Error('Local isolated server and browser required')
const connection=new URL(process.env.DATABASE_TRANSACTION_URL||process.env.DATABASE_URL)
connection.searchParams.set('connect_timeout','30');connection.searchParams.set('connection_limit','1');connection.searchParams.set('sslmode','require')
const db=new PrismaClient({datasourceUrl:connection.toString()}),accounts=[]
const auth=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
async function account(role){
 const email=`compose-${role.toLowerCase()}-${randomUUID()}@example.invalid`,password=randomBytes(32).toString('base64url')
 const result=await auth.auth.admin.createUser({email,password,email_confirm:true});if(result.error)throw new Error('Temporary identity creation failed')
 const a={identity:result.data.user.id,email,role,jar:new Map()};accounts.push(a)
 a.user=await db.user.create({data:{email,authId:a.identity,role,name:'Composer verification',...(role==='DRIVER'?{driver:{create:{displayName:'Composer verification'}}}:{})}})
 const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[...a.jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>a.jar.set(name,value))}})
 if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Temporary sign-in failed')
 return a
}
function browserMocks(role){
 window.__sent=[];window.__empty=false;window.__fail=false
 const messages=[]
 window.fetch=async(input,init={})=>{
  const url=new URL(input instanceof Request?input.url:String(input),location.origin),path=url.pathname,method=init.method||'GET'
  const job={ref:'UI-BOOKING',route:'Verification pickup → destination',status:'DRIVER_ASSIGNED',statusLabel:'Driver assigned',nextAction:'Acknowledge assignment',time:'12:00',dateLabel:'Tomorrow',pax:1,bags:1,vehicle:'Assigned vehicle',pickup:'Pickup',dropoff:'Destination',customer:'Verification passenger',pickupAt:null,phone:null,flight:null,plate:null,notes:null,service:'Transfer'}
  const list=window.__empty?[]:[job]
  if(window.__fail&&(path==='/api/messages'||path==='/api/driver/bookings')&&method==='GET')return Response.json({ok:false,message:'Temporary conversations error'},{status:503})
  if(path==='/api/auth/session')return Response.json({user:{id:'ui',role,email:'ui@example.invalid',name:'Composer verification'}})
  if(path==='/api/driver/me')return Response.json({ok:true,authenticated:true,driver:{id:'ui-driver',displayName:'Composer verification',email:'ui@example.invalid',status:'Available'}})
  if(path==='/api/driver/bookings')return Response.json({ok:true,jobs:list,active:list,history:[]})
  if(path==='/api/messages'&&method==='GET')return Response.json({ok:true,threads:list.map(j=>({ref:j.ref,title:j.route}))})
  if(path.startsWith('/api/messages/')||path.includes('/messages')||path==='/api/messages'){
   if(method==='POST'){const body=JSON.parse(init.body);window.__sent.push(body);messages.push({id:String(messages.length+1),body:body.body,authorRole:role==='DRIVER'?'driver':'customer',time:'12:00'});return Response.json({ok:true,message:{id:String(messages.length)}},{status:201})}
   return Response.json({ok:true,messages,items:[],push:false})
  }
  return Response.json({ok:true,blocks:{}})
 }
}
async function verify(a,path){
 const page=await fetch(`${debug}/json/new?about:blank`,{method:'PUT'}).then(r=>r.json()),ws=new WebSocket(page.webSocketDebuggerUrl)
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
 let seq=0;const pending=new Map()
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(!m.id)return;const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}})
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error('Browser evaluation failed');return r.result.value}
 const wait=async expression=>{const end=Date.now()+60000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,300))}throw new Error(`Browser state timed out: ${path}`)}
 try{
  await call('Page.enable');await call('Network.enable');await call('Network.clearBrowserCookies')
  await call('Network.setCookies',{cookies:[...a.jar].map(([name,value])=>({name,value,url:origin,path:'/',sameSite:'Lax'}))})
  await call('Page.addScriptToEvaluateOnNewDocument',{source:`(${browserMocks.toString()})(${JSON.stringify(a.role)})`})
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await call('Page.navigate',{url:origin+path})
  if(path==='/driver'){
   await wait("[...document.querySelectorAll('nav button')].some(b=>b.textContent.trim()==='Messages')")
   await evaluate("[...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()==='Messages').click()")
  }
  await wait("!!document.querySelector('textarea[aria-label=Message]')&&!document.querySelector('textarea[aria-label=Message]').disabled")
  await evaluate("document.querySelector('textarea').scrollIntoView({block:'center'})")
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true)
  assert.equal(await evaluate("(()=>{const r=document.querySelector('textarea').getBoundingClientRect();return r.width>100&&r.top<innerHeight&&r.bottom>0})()"),true)
  await evaluate("(()=>{const t=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,'Browser verification message');t.dispatchEvent(new Event('input',{bubbles:true}))})()")
  await wait("!document.querySelector('[aria-label=\"Send message\"]').disabled")
  await evaluate("document.querySelector('[aria-label=\"Send message\"]').click()")
  await wait('window.__sent.length===1')
  assert.equal(await evaluate('window.__sent[0].body'),'Browser verification message')
  if(a.role==='DRIVER')assert.equal(await evaluate("window.__sent[0].bookingRef===undefined"),true)
  else assert.equal(await evaluate('window.__sent[0].bookingRef'),'UI-BOOKING')
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true)
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await evaluate("window.__empty=true;document.dispatchEvent(new Event('visibilitychange'))")
  await wait("document.querySelector('textarea[aria-label=Message]')?.disabled===true")
  assert.equal(await evaluate("!!document.querySelector('a[href=\"/contact\"]')"),true)
  await evaluate("window.__fail=true;document.dispatchEvent(new Event('visibilitychange'))")
  await wait("document.body.innerText.includes('Temporary conversations error')")
  assert.equal(await evaluate("!!document.querySelector('textarea[aria-label=Message]')"),true)
  const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`/tmp/iceland-compose-${a.role.toLowerCase()}.png`,Buffer.from(screenshot.data,'base64'))
  console.log(`Browser ${a.role} ${path}: composer, mock send, mobile/desktop fit, empty state and loading error passed.`)
 }finally{ws.close();await fetch(`${debug}/json/close/${page.id}`).catch(()=>{})}
}
try{if(!process.argv.includes('--driver-only')){const customer=await account('CUSTOMER');await verify(customer,'/messages')}const driver=await account('DRIVER');await verify(driver,'/driver');await verify(driver,'/messages')}
catch(e){console.error('Composer browser check failed:',e.name==='AssertionError'?e.stack:e.message);process.exitCode=1}
finally{for(const a of accounts){if(a.user)await db.user.deleteMany({where:{id:a.user.id}});if((await auth.auth.admin.deleteUser(a.identity)).error){console.error('Temporary identity cleanup needs retry');process.exitCode=1}}await db.$disconnect();console.log('Temporary composer accounts removed.')}
