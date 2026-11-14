import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

export async function verifyCustomerBrowser(jar, origin) {
  const debug = process.env.CHROME_DEBUG_URL
  if (!debug) return
  const page = await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (!message.id) return
    const callbacks = pending.get(message.id)
    if (!callbacks) return
    pending.delete(message.id)
    if (message.error) callbacks.reject(new Error(message.error.message))
    else callbacks.resolve(message.result)
  })
  function call(method, params = {}) { return new Promise((resolve, reject) => { const seq = ++id; pending.set(seq, { resolve, reject }); ws.send(JSON.stringify({ id: seq, method, params })) }) }
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error('Browser evaluation failed')
    return result.result.value
  }
  async function waitFor(expression) {
    const end = Date.now() + 90000
    while (Date.now() < end) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 500)) }
    throw new Error('Browser state timed out')
  }
  try {
    await call('Network.enable')
    await call('Network.setCookies', { cookies: [...jar].map(([name, value]) => ({ name, value, url: origin, path: '/', sameSite: 'Lax' })) })
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
    await call('Browser.setPermission', { permission: { name: 'notifications' }, setting: 'denied', origin })
    await call('Page.navigate', { url: `${origin}/account` })
    await waitFor("document.body.innerText.includes('No upcoming trips yet') && !!document.querySelector('details summary')")
    assert.equal(await evaluate("document.body.innerText.includes('ITB-7K4Q2M') || document.body.innerText.includes('Hotel Borg') || document.body.innerText.includes('Emma Larsen')"), false)
    assert.equal(await evaluate("[...document.querySelectorAll('a')].some(a => a.getAttribute('href') === '/book' && a.textContent.includes('Book a ride'))"), true)
    console.log('Browser: real empty state, no sample customer data, booking action present: PASS')
    assert.equal(await evaluate("!!document.querySelector('dialog[open]')"), false)
    assert.equal(await evaluate("!!document.querySelector('input[autocomplete=name]')"), false)
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Edit profile')).click()")
    await waitFor("!!document.querySelector('dialog[open] input[autocomplete=name]')")
    assert.equal(await evaluate("(()=>{const r=document.querySelector('dialog[open]').getBoundingClientRect();return r.left>0&&r.top>0&&r.width<=672})()"), true)
    await call('Page.captureScreenshot', { format: 'png' }).then(s => writeFile('/tmp/iceland-profile-dialog.png', Buffer.from(s.data,'base64')))
    await evaluate("(()=>{const input=document.querySelector('dialog input[autocomplete=tel]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'+354 555 0100');input.dispatchEvent(new Event('input',{bubbles:true}))})()")
    await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Save profile').click()")
    await waitFor("document.querySelector('dialog').textContent.includes('Your profile was saved.')")
    assert.equal(await evaluate("fetch('/api/account/profile').then(r=>r.json()).then(d=>d.profile.phone)"),'+354 555 0100')

    await evaluate("document.querySelector('[aria-label=\"Close edit profile\"]').click()")
    await waitFor("!document.querySelector('dialog[open]')")
    assert.equal(await evaluate("document.activeElement.textContent.includes('Edit profile')"), true)
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Edit profile')).click()")
    await waitFor("!!document.querySelector('dialog[open]')")
    await call('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape' })
    await waitFor("!document.querySelector('dialog[open]')")
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Edit profile')).click()")
    await waitFor("!!document.querySelector('dialog[open]')")
    await call('Input.dispatchMouseEvent',{type:'mousePressed',x:5,y:5,button:'left',clickCount:1})
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:5,y:5,button:'left',clickCount:1})
    await waitFor("!document.querySelector('dialog[open]')")
    console.log('Browser: profile stays out of page flow; centered dialog closes by button, Escape and backdrop with focus restoration: PASS')

    await evaluate("document.querySelector('details summary').click()")
    await waitFor("document.querySelector('details').open")
    await evaluate("document.querySelector('[aria-label=\"Close account menu\"]').click()")
    assert.equal(await evaluate("document.querySelector('details').open"), false)
    await evaluate("document.querySelector('details summary').click(); document.querySelector('h1').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))")
    assert.equal(await evaluate("document.querySelector('details').open"), false)
    await evaluate("document.querySelector('details summary').click()")
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' })
    assert.equal(await evaluate("document.querySelector('details').open"), false)
    console.log('Browser: account menu closes by icon, outside click, and Escape: PASS')
    assert.equal(await evaluate("document.querySelector('[role=switch]').getAttribute('aria-checked')"), 'false')
    await evaluate("document.querySelector('[role=switch]').click()")
    await waitFor("document.querySelector('[role=switch]').getAttribute('aria-checked') === 'true' && !document.querySelector('[role=switch]').disabled")
    assert.equal(await evaluate("document.body.innerText.includes('Phone notifications are blocked')"), true)
    await evaluate("document.querySelector('[role=switch]').click()")
    await waitFor("document.querySelector('[role=switch]').getAttribute('aria-checked') === 'false' && !document.querySelector('[role=switch]').disabled")
    console.log('Browser: alert switch toggles on/off and explains denied phone permission: PASS')
    await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
    const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile('/tmp/iceland-customer-empty.png', Buffer.from(screenshot.data, 'base64'))
    console.log('Browser: mobile dashboard fits viewport; screenshot saved locally: PASS')
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Edit profile')).click()")
    await waitFor("!!document.querySelector('dialog[open] input[autocomplete=name]')")
    assert.equal(await evaluate("(()=>{const r=document.querySelector('dialog[open]').getBoundingClientRect();return Math.abs(r.left)<2&&Math.abs(r.bottom-window.innerHeight)<2&&r.width<=window.innerWidth})()"),true)
    assert.equal(await evaluate("document.body.style.overflow==='hidden'"),true)
    await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(s=>writeFile('/tmp/iceland-profile-sheet.png',Buffer.from(s.data,'base64')))
    await evaluate("document.querySelector('[aria-label=\"Close edit profile\"]').click()")
    await waitFor("!document.querySelector('dialog[open]')")
    assert.equal(await evaluate("document.body.style.overflow==='hidden'"),false)
    console.log('Browser: mobile profile uses a bottom sheet, fits viewport and restores page scrolling: PASS')

  } finally { ws.close(); await fetch(`${debug}/json/close/${page.id}`).catch(() => {}) }
}
