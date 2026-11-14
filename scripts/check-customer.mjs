// Controlled customer API test: temporary records are removed in finally.
// Run only against a local server with outbound notifications disabled.
import nextEnv from '@next/env'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { randomUUID, randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'
nextEnv.loadEnvConfig(process.cwd())
const origin = process.argv[2] || 'http://127.0.0.1:3101'
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Use a local test server.')
const databaseUrl = new URL(process.env.DIRECT_URL)
databaseUrl.searchParams.set('connect_timeout', '20')
databaseUrl.searchParams.set('connection_limit', '1')
const db = new PrismaClient({ datasourceUrl: databaseUrl.toString() })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const marker = randomUUID()
const email = `customer-check-${marker}@example.invalid`
const refs = [`CHECK-${marker}`, `OTHER-${marker}`]
let identity
let client
const jar = new Map()
async function request(path, options = {}, attempt = 0) {
  const response = await fetch(origin + path, { ...options, headers: { 'Content-Type': 'application/json', Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), ...options.headers } })
  if (response.status === 503 && (!options.method || options.method === 'GET') && attempt < 2) { await response.arrayBuffer(); console.log('Transient GET service failure; retrying:', path.split('?')[0]); return request(path, options, attempt + 1) }
  return { status: response.status, body: await response.json().catch(() => ({ message: `Non-JSON response (${response.status})` })) }
}
try {
  const password = randomBytes(32).toString('base64url')
  const result = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (result.error) throw new Error('Temporary Auth user creation failed')
  identity = result.data.user
  await db.user.create({ data: { email, name: 'Temporary verification account', role: 'CUSTOMER', authId: identity.id } })
  client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: values => values.forEach(({ name, value }) => jar.set(name, value)) } })
  const login = await client.auth.signInWithPassword({ email, password })
  if (login.error) throw new Error('Temporary customer sign-in failed')
  const empty = await request('/api/account/trips')
  assert.equal(empty.status, 200); assert.equal(empty.body.trips.length, 0)
  console.log('New customer has no sample trips: PASS')
  if (process.env.CHROME_DEBUG_URL) { const { verifyCustomerBrowser } = await import('./customer-browser-check.mjs'); await verifyCustomerBrowser(jar, origin) }
  const common = { serviceLabel: 'Temporary verification', routeLabel: 'Temporary verification route', currency: 'ISK', amountSnapshot: 1000 }
  const own = await db.booking.create({ data: { ...common, ref: refs[0], guestEmail: email, guestName: 'Temporary verification account' } })
  await db.booking.create({ data: { ...common, ref: refs[1], guestEmail: `other-${email}` } })
  const trips = await request('/api/account/trips')
  assert.equal(trips.status, 200); assert.deepEqual(trips.body.trips.map(t => t.ref), [refs[0]])
  console.log('Customer sees only their own real booking: PASS')
  const threads = await request('/api/messages?as=customer')
  assert.equal(threads.status, 200); assert.equal(threads.body.threads[0].ref, refs[0])
  console.log('Booking without messages can start a conversation: PASS')
  const denied = await request(`/api/messages/${refs[1]}?as=customer`)
  assert.equal(denied.status, 403)
  const spoof = await request('/api/messages', { method: 'POST', body: JSON.stringify({ bookingRef: refs[1], body: 'Temporary test', guestEmail: `other-${email}`, as: 'customer' }) })
  assert.equal(spoof.status, 403)
  console.log('Other customer data and spoofed message identity rejected: PASS')
  const blank = await request('/api/messages', { method: 'POST', body: JSON.stringify({ bookingRef: refs[0], body: '   ', as: 'customer' }) })
  assert.equal(blank.status, 400)
  const sent = await request('/api/messages', { method: 'POST', body: JSON.stringify({ bookingRef: refs[0], body: 'Temporary customer verification message', as: 'customer' }) })
  assert.equal(sent.status, 201)
  assert.equal(await db.message.count({ where: { bookingId: own.id, authorRole: 'customer' } }), 1)
  console.log('Customer message saved to Supabase; blank message rejected: PASS')
  await db.message.create({ data: { bookingId: own.id, authorRole: 'staff', body: 'Temporary verification reply', unread: true } })
  const alerts = await request('/api/messages/alerts?as=customer')
  assert.equal(alerts.status, 200); assert.equal(alerts.body.items.length, 1)
  const read = await request(`/api/messages/${refs[0]}?as=customer`)
  assert.equal(read.status, 200); assert.equal(read.body.messages.length, 2)
  const after = await request('/api/messages/alerts?as=customer')
  assert.equal(after.body.items.length, 0)
  console.log('Customer receives reply and unread alert; opening thread marks it read: PASS')
  const profile = { name: 'Updated verification account', phone: '+354 555 0100', category: 'RESIDENT', preferredCurrency: 'ISK', preferredLang: 'en' }
  assert.equal((await request('/api/account/profile', { method: 'PATCH', body: JSON.stringify({ ...profile, role: 'SUPER_ADMIN' }) })).status, 400)
  assert.equal((await request('/api/account/profile', { method: 'PATCH', body: JSON.stringify(profile) })).status, 200)
  assert.equal((await request('/api/account/profile')).body.profile.name, profile.name)
  console.log('Profile persists; privilege fields rejected: PASS')
  for (const path of [`/api/account/bookings/${refs[1]}/receipt`, `/api/payments/teya/status?ref=${refs[1]}`]) assert.equal((await request(path)).status, 404)
  const cancel = ref => request(`/api/account/bookings/${ref}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Temporary verification cancellation' }) })
  assert.equal((await cancel(refs[1])).status, 404)
  assert.equal((await request('/api/payments/checkout', { method: 'POST', body: JSON.stringify({ bookingRef: refs[1] }) })).status, 404)
  assert.equal((await request(`/api/account/bookings/${refs[0]}/receipt`)).status, 409)
  const before = await request(`/api/payments/teya/status?ref=${refs[0]}&payment=success`)
  assert.equal(before.body.paid, false)
  assert.equal((await cancel(refs[0])).body.status, 'CANCELLED')
  assert.equal((await cancel(refs[0])).body.status, 'CANCELLED')
  await db.booking.update({ where: { id: own.id }, data: { status: 'CONFIRMED', pickupAt: new Date(Date.now() + 7 * 86400000) } })
  const payment = await db.payment.create({ data: { bookingId: own.id, provider: 'teya', providerRef: `test-${marker}`, status: 'CAPTURED', amount: 1000, currency: 'ISK' } })
  const receiptResponse = await fetch(origin + `/api/account/bookings/${refs[0]}/receipt`, { headers: { Cookie: [...jar].map(([k,v]) => `${k}=${v}`).join('; ') } })
  assert.equal(receiptResponse.status, 200)
  assert.match(await receiptResponse.text(), /1[,. ]?000/)
  assert.equal((await cancel(refs[0])).body.status, 'REFUND_REQUESTED')
  assert.equal((await db.payment.findUnique({ where: { id: payment.id } })).status, 'CAPTURED')
  await db.booking.update({ where: { id: own.id }, data: { status: 'IN_PROGRESS' } })
  assert.equal((await cancel(refs[0])).status, 409)
  console.log('Private payment/receipt access, unpaid cancellation, paid review, started-trip lock and false payment query: PASS')
  const endpoint = `https://push.example.invalid/${marker}`
  await db.pushSubscription.create({ data: { endpoint, p256dh: 'temporary', auth: 'temporary', audience: 'customer', guestEmail: email } })
  const disabled = await request('/api/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) })
  assert.equal(disabled.status, 200)
  assert.equal(await db.pushSubscription.count({ where: { endpoint } }), 0)
  console.log('Turning off alerts removes the customer background subscription: PASS')
  const weather = await request('/api/account/weather?latitude=64.15&longitude=-21.94')
  assert.equal(weather.status, 200)
  assert.equal(typeof weather.body.temperature, 'number')
  console.log('Authenticated local weather returns live forecast data: PASS')
} catch (error) {
  console.error('Customer verification failed:', error.message)
  process.exitCode = 1
} finally {
  await client?.auth.signOut({ scope: 'local' })
  await db.pushSubscription.deleteMany({ where: { guestEmail: email } })
  await db.emailNotice.deleteMany({ where: { bookingRef: { in: refs } } })
  await db.staffNotification.deleteMany({ where: { bookingRef: { in: refs } } })
  await db.message.deleteMany({ where: { booking: { ref: { in: refs } } } })
  await db.payment.deleteMany({ where: { booking: { ref: { in: refs } } } })
  await db.booking.deleteMany({ where: { ref: { in: refs } } })
  await db.user.deleteMany({ where: { email } })
  if (identity) await admin.auth.admin.deleteUser(identity.id)
  await db.$disconnect()
  console.log('Temporary account, bookings, messages, and notices removed.')
}
