// Local prebuilt smoke test. Run against an isolated server with outbound payments disabled.
import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
const origin=process.argv[2]||'http://127.0.0.1:3112',debug=process.env.CHROME_DEBUG_URL
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname)||!debug)throw new Error('Local isolated browser/server required')
const health=await fetch(origin+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).ok,true)
const page=await fetch(debug+'/json/new?about:blank',{method:'PUT'}).then(r=>r.json()),ws=new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
let seq=0;const pending=new Map(),errors=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)})
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error('Browser evaluation failed');return r.result.value}
const wait=async expression=>{const end=Date.now()+60000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,300))}throw new Error('Browser recovery state timed out')}
try{
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*','https://images.unsplash.com/*']})
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__pricesUp=false;const originalFetch=window.fetch.bind(window);window.fetch=async(input,init)=>{const u=new URL(input instanceof Request?input.url:String(input),location.origin);if(u.pathname==='/api/listings'){if(!window.__pricesUp)return new Response('<!DOCTYPE html>Internal Server Error',{status:500,headers:{'Content-Type':'text/html'}});return Response.json({ok:true,listings:[{id:'recovered-route',kind:'route',category:'airport',serviceId:null,routeId:'route',title:'Recovered airport route',fromLabel:'Keflavik',toLabel:'Reykjavik',fromIsk:10000,iskPerEur:150,minutes:45,km:50,hoursLabel:null,paxLabel:null,blurb:null,imageUrl:null}]})}if(u.pathname.startsWith('/api/'))return new Response('<!DOCTYPE html>Internal Server Error',{status:500,headers:{'Content-Type':'text/html'}});return originalFetch(input,init)};`})
 await call('Page.navigate',{url:origin+'/'})
 await wait("document.body.innerText.includes('Retry prices')")
 assert.equal(await evaluate("document.body.innerText.includes('We couldn’t load this page')"),false)
 assert.equal(await evaluate("document.body.innerText.includes('Discover Iceland')"),true)
 assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true)
 await evaluate("window.__pricesUp=true;[...document.querySelectorAll('button')].find(b=>b.textContent==='Retry prices').click()")
 await wait("document.body.innerText.includes('Keflavik → Reykjavik')")
 assert.equal(await evaluate("document.body.innerText.includes('Retry prices')"),false)
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
 assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true)
 await evaluate("window.__pricesUp=false")
 await call('Page.navigate',{url:origin+'/book?pickup=Keflavik&destination=Reykjavik'})
 await wait("document.body.innerText.includes('Retry prices')")
 assert.equal(await evaluate("document.body.innerText.includes('We couldn’t load this page')"),false)
 const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('/tmp/itb-public-outage.png',Buffer.from(shot.data,'base64'))
 assert.deepEqual(errors,[])
 console.log('Extracted prebuilt app: health, homepage HTML-500 survival, retry recovery, booking outage and mobile/desktop layout passed.')
}finally{ws.close();await fetch(debug+'/json/close/'+page.id).catch(()=>{})}
