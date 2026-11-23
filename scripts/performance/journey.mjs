// Fixture-only browser acceptance. Hardcoded loopback origin; never sends real mail/payment.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
const origin='http://127.0.0.1:3118',debug='http://127.0.0.1:9250'
const page=await(await fetch(debug+'/json/new?about:blank',{method:'PUT'})).json(),ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r)
let seq=0;const pending=new Map(),keepAlive=setInterval(()=>{},1000),reports=[];let checkoutNavigated=false
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})
ws.onmessage=async event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(m.error):p.resolve(m.result);return}if(m.method==='Runtime.bindingCalled'){reports.push(JSON.parse(m.params.payload))}if(m.method==='Fetch.requestPaused'){const u=new URL(m.params.request.url);try{if(u.hostname==='checkout.example'){checkoutNavigated=true;await call('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html'}],body:Buffer.from('<h1>Fixture checkout destination</h1>').toString('base64')})}else await call('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'BlockedByClient'})}catch{}}}
const js=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error('Fixture evaluation failed: '+r.exceptionDetails.text);return r.result?.value}
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),until=async expression=>{for(let i=0;i<200;i++){if(await js(expression))return;await sleep(100)}throw Error('Fixture state timed out: '+expression)}
try{
 await call('Page.enable');await call('Runtime.enable');await call('Runtime.addBinding',{name:'fixtureReport'});await call('Fetch.enable',{patterns:[{urlPattern:'https://*'},{urlPattern:'http://localhost:*'}]})
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`
 const route={id:'fixture-route',kind:'route',category:'airport',serviceId:'fixture-service',routeId:'fixture-route',title:'Airport transfer',fromLabel:'KEF',toLabel:'Reykjavík',fromIsk:22900,iskPerEur:150,minutes:45,km:49,hoursLabel:'45 min',paxLabel:null,blurb:null,imageUrl:null};
 window.__fixture={catalogue:0,pay:0,signup:0,resend:0};const original=window.fetch.bind(window);
 window.fetch=async(input,init={})=>{const u=new URL(input instanceof Request?input.url:String(input),location.origin);if(!u.pathname.startsWith('/api/'))return original(input,init);let data={ok:true};
 if(u.pathname==='/api/listings'){window.__fixture.catalogue++;data={ok:true,listings:[route]}}
 else if(u.pathname==='/api/auth/get-session')data=null;
 else if(u.pathname==='/api/auth/session')data={user:null};
 else if(u.pathname==='/api/auth/sign-up/email'){window.__fixture.signup++;data={user:{id:'fixture-customer',name:'Fixture Customer',email:'fixture@example.test',emailVerified:false},token:null}}
 else if(u.pathname==='/api/auth/send-verification-email'){window.__fixture.resend++;data={status:true}}
 else if(u.pathname==='/api/public/site')data={ok:true,blocks:{}};
 else if(u.pathname==='/api/company')data={company:{}};
 else if(u.pathname==='/api/vehicles')data={ok:true,vehicles:[{id:'fixture-car',name:'Fixture car',pax:4,bags:4,upgradeIsk:0}]};
 else if(u.pathname==='/api/bookings/quote')data={ok:true,quote:{amountSnapshot:153,amountIskSnapshot:22900,currency:'EUR'},meta:{vehicleId:'fixture-car',vehicleUpgradeIsk:0}};
 else if(u.pathname==='/api/payments/checkout'){window.__fixture.pay++;const body=JSON.parse(init.body);fixtureReport(JSON.stringify({stage:'pay-request',retained:body.create.listingId==='fixture-route'&&body.create.passengers===3&&body.create.luggage===2&&body.create.pickupAt==='2027-01-02T12:30:00.000Z',stableKey:typeof body.requestKey==='string'}));await new Promise(r=>setTimeout(r,200));data={ok:true,booking:{listingId:'fixture-route',adminPriceIsk:22900,vehicleId:'fixture-car',vehicle:{upgradeIsk:0},amountIskSnapshot:22900},checkoutUrl:'https://checkout.example/fixture'}}
 return Response.json(data)};
 window.fixtureSet=(element,value)=>{const prototype=element instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,value);element.dispatchEvent(new Event(element instanceof HTMLSelectElement?'change':'input',{bubbles:true}))};
 new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.name==='itb.pay-to-redirect')fixtureReport(JSON.stringify({stage:'pay-to-redirect',ms:e.duration}))}).observe({type:'measure'});
 `})
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
 await call('Page.navigate',{url:origin+'/signup'});await until(`!!document.querySelector('input[autocomplete=name]')`)
 await js(`fixtureSet(document.querySelector('input[autocomplete=name]'),'Fixture Customer');fixtureSet(document.querySelector('input[type=email]'),'fixture@example.test');fixtureSet(document.querySelector('input[type=password]'),'Fixture-password-123')`)
 await js(`document.querySelector('form').requestSubmit()`);await until(`document.querySelector('h1')?.textContent==='Check your email'`)
 assert.equal(await js(`!!document.querySelector('form')`),false);assert(await js(`!![...document.querySelectorAll('a')].find(a=>a.textContent==='Go to sign in')`));assert(await js(`document.documentElement.scrollWidth<=innerWidth`))
 let shot=await call('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/iceland-signup-check-email-mobile.png',Buffer.from(shot.data,'base64'))
 await js(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Resend confirmation email').click()`);await until(`window.__fixture.resend===1`)
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await sleep(100);shot=await call('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/iceland-signup-check-email-desktop.png',Buffer.from(shot.data,'base64'))
 console.log('Customer signup: verification screen, no remaining signup form, resend, sign-in link and mobile overflow passed (mocked auth, no mail).')
 await call('Page.navigate',{url:origin+'/'});await until(`document.querySelector('select')?.options.length>1`)
 await js(`{const s=document.querySelectorAll('form select');fixtureSet(s[0],'KEF');}`);await sleep(50)
 await js(`{const s=document.querySelectorAll('form select');fixtureSet(s[1],'Reykjavík');fixtureSet(s[2],'3');fixtureSet(s[3],'2');fixtureSet(document.querySelector('form input[type=date]'),'2027-01-02');fixtureSet(document.querySelector('form input[type=time]'),'12:30')}`)
 await js(`document.querySelector('form').requestSubmit()`);await until(`location.pathname==='/search'&&!![...document.querySelectorAll('a')].find(a=>a.textContent.includes('Book journey'))`)
 assert.equal(await js(`window.__fixture.catalogue`),1)
 await js(`[...document.querySelectorAll('a')].find(a=>a.textContent.includes('Book journey')).click()`);await until(`location.pathname==='/book'&&!!document.querySelector('input[type=email]')`)
 await js(`fixtureSet(document.querySelector('input[type=email]'),'fixture@example.test');fixtureSet([...document.querySelectorAll('label')].find(l=>l.textContent.includes('Full name')).querySelector('input'),'Fixture Customer');fixtureSet(document.querySelector('input[placeholder="Enter address"]'),'Fixture terminal')`)
 await until(`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Pay ')&&!b.disabled)`)
 const start=performance.now();await js(`const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Pay ')&&!b.disabled);b.click();b.click()`)
 for(let i=0;i<100&&!checkoutNavigated;i++)await sleep(50)
 assert(checkoutNavigated);const pay=reports.filter(r=>r.stage==='pay-request');assert.equal(pay.length,1);assert(pay[0].retained&&pay[0].stableKey)
 const result={conditions:'Loopback production build, all API responses mocked; checkout response deliberately waits200ms; checkout.example fulfilled locally, no outbound payment/email',reports,observedClickToNavigationMs:Math.round(performance.now()-start),duplicatePosts:pay.length}
 await writeFile('docs/performance/journey-fixture.json',JSON.stringify(result,null,2)+'\n');console.log('Home → search → booking retains date/time/pax/luggage/listing; one catalogue fetch; double Pay click creates one mocked request; immediate fixture redirect passed.')
}finally{clearInterval(keepAlive);ws.close();await fetch(debug+'/json/close/'+page.id).catch(()=>{})}
