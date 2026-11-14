import assert from 'node:assert/strict'
const origin = 'http://127.0.0.1:3101'
const debug = 'http://127.0.0.1:9224'
const page = await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
let sequence = 0
const pending = new Map()
const requests = new Map()
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Network.requestWillBeSent') {
    const url = new URL(message.params.request.url)
    if (url.origin === origin && url.pathname.startsWith('/api/')) requests.set(url.pathname, (requests.get(url.pathname) || 0) + 1)
  }
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id); pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result)
  }
})
function call(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) }) }
try {
  await call('Network.enable')
  await call('Page.navigate', { url: `${origin}/login` })
  await new Promise(r => setTimeout(r, 40000))
  assert.equal(requests.get('/api/messages/alerts') || 0, 0)
  assert.equal(requests.get('/api/auth/session'), 1)
  console.log('Signed-out browser over 40 seconds: zero alert requests, one session request: PASS')
  await call('Runtime.evaluate', { expression: "for(let i=0;i<10;i++) window.dispatchEvent(new Event('focus'))" })
  await new Promise(r => setTimeout(r, 2000))
  assert.equal(requests.get('/api/auth/session'), 2)
  assert.equal(requests.get('/api/messages/alerts') || 0, 0)
  console.log('Ten rapid focus events produce one session refresh and no alert polling: PASS')
  console.log('API request counts:', JSON.stringify(Object.fromEntries(requests)))
} finally { ws.close(); await fetch(`${debug}/json/close/${page.id}`).catch(() => {}) }
