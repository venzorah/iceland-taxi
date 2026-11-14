import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
export async function verifyDriverBrowser(jar, origin) {
  const debug = process.env.CHROME_DEBUG_URL
  if (!debug) return
  const page = await fetch(`${debug}/json/new?about:blank`, { method:'PUT' }).then(r=>r.json())
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
  let seq=0;const pending=new Map()
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(!m.id)return;const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)})
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})
  const evaluate=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value
  const wait=async expression=>{const end=Date.now()+90000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,500))}throw new Error('Driver browser state timed out')}
  try {
    await call('Network.enable')
    await call('Network.setCookies',{cookies:[...jar].map(([name,value])=>({name,value,url:origin,path:'/',sameSite:'Lax'}))})
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
    await call('Page.navigate',{url:origin+'/driver'})
    await wait("document.body.innerText.includes('Other assigned journeys') && document.body.innerText.includes('Acknowledge assignment')")
    assert.equal(await evaluate("document.body.innerText.includes('Demo login') || document.body.innerText.includes('example.local')"),false)
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true)
    assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.innerText==='Sign out' && b.getBoundingClientRect().width>0)"),true)
    await evaluate("document.querySelector('details summary').click()")
    assert.equal(await evaluate("document.body.innerText.includes('My account & availability')"),true)
    await evaluate("document.querySelector('details summary').click()")
    const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
    await writeFile('/tmp/iceland-driver-mobile.png',Buffer.from(screenshot.data,'base64'))
    await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true)
    console.log('Browser: authenticated real driver jobs, mobile/desktop fit, account controls and mobile sign-out: PASS')
  } finally {ws.close();await fetch(`${debug}/json/close/${page.id}`).catch(()=>{})}
}
