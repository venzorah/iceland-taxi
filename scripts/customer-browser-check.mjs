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
  } finally { ws.close(); await fetch(`${debug}/json/close/${page.id}`).catch(() => {}) }
}
