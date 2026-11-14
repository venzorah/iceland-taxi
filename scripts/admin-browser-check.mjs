import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
export async function verifyAdminBrowser(superJar,financeJar,origin){
 const debug=process.env.CHROME_DEBUG_URL;if(!debug)return
 for(const [jar,role] of [[superJar,'super'],[financeJar,'finance']]){
  const page=await fetch(`${debug}/json/new?about:blank`,{method:'PUT'}).then(r=>r.json()),ws=new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
  let seq=0;const pending=new Map()
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(!m.id)return;const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)})
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})
  const evaluate=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value
  const wait=async expression=>{const end=Date.now()+90000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,500))}throw new Error(`Admin ${role} browser timed out`)}
  try{
   await call('Network.enable');await call('Network.clearBrowserCookies')
   await call('Network.setCookies',{cookies:[...jar].map(([name,value])=>({name,value,url:origin,path:'/',sameSite:'Lax'}))})
   await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
   await call('Page.navigate',{url:origin+'/admin'})
   await wait(role==='super'?"document.body.innerText.includes('Booking values')":"document.body.innerText.includes('Payments & refunds') && document.querySelector('aside')")
   assert.equal(await evaluate("document.body.innerText.includes('admin@example.local') || document.body.innerText.includes('Chart remains illustrative')"),false)
   if(role==='super'){
    await evaluate("[...document.querySelectorAll('aside button')].find(b=>b.innerText==='Bookings').click()")
    await wait("!!document.querySelector('[aria-label=\"Search bookings\"]')")
   }else{
    assert.equal(await evaluate("[...document.querySelectorAll('aside button')].some(b=>b.innerText==='Staff & permissions' || b.innerText==='Customers' || b.innerText==='Drivers')"),false)
   }
   await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
   assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true)
   await evaluate("document.querySelector('[aria-label=\"Open menu\"]').click()")
   await wait("document.querySelector('[aria-label=\"Open menu\"]').getAttribute('aria-expanded')==='true'")
   const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
   await writeFile(`/tmp/iceland-admin-${role}-mobile.png`,Buffer.from(shot.data,'base64'))
   console.log(`Browser: ${role} real identity, permitted navigation, mobile fit and menu: PASS`)
  }finally{ws.close();await fetch(`${debug}/json/close/${page.id}`).catch(()=>{})}
 }
}
