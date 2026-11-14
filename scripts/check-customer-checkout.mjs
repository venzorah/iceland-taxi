// Local-only checkout integration. Temporary fixtures only; disable outbound notifications on server.
import nextEnv from '@next/env'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
nextEnv.loadEnvConfig(process.cwd())
const origin = process.argv[2] || 'http://127.0.0.1:3103'
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw new Error('Local server required')
const mock = process.env.CUSTOMER_TEST_RUN_ID
const marker = mock || randomUUID()
const db = new PrismaClient()
const requestKey = randomUUID()
const keys = [requestKey]
let vehicle, route
const jar = new Map()
async function request(path, body, cookies = true) {
  const res = await fetch(origin + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(cookies ? { Cookie: [...jar].map(([k,v]) => `${k}=${v}`).join('; ') } : {}) }, body: body ? JSON.stringify(body) : undefined })
  if (cookies) for (const cookie of res.headers.getSetCookie()) { const [pair] = cookie.split(';'); const i = pair.indexOf('='); jar.set(pair.slice(0,i),pair.slice(i+1)) }
  return { status: res.status, body: await res.json() }
}
try {
  vehicle = await db.vehicle.create({ data: { name: `Verification ${marker}`, category: 'test', pax: 4, bags: 3, upgradeIsk: 500 } })
  route = await db.route.create({ data: { fromLabel: `Verification ${marker}`, toLabel: 'Verification destination', fromIsk: 10000, minutes: 60 } })
  const create = { guestName: 'Temporary checkout verification', guestEmail: `checkout-${marker}@example.invalid`, pickupAddress: 'Temporary verification address', pickupAt: new Date(Date.now() + 7 * 86400000).toISOString(), passengers: 1, luggage: 1, vehicleId: vehicle.id, listingId: route.id, listingKind: 'route', customerCategory: 'RESIDENT', currency: 'ISK' }
  const checkout = await request('/api/payments/checkout', { requestKey, create: { ...create, amount: 1 }, amount: 1 })
  assert.equal(checkout.status, mock ? 200 : 503)
  const saved = await db.booking.findUniqueOrThrow({ where: { requestKey }, include: { payments: true } })
  assert.equal(saved.amountSnapshot, 10500)
  assert.equal(saved.customerId, null)
  assert.equal(saved.status, 'AWAITING_PAYMENT')
  const retry = await request('/api/payments/checkout', { requestKey, create })
  assert.equal(retry.status, mock ? 200 : 503)
  assert.equal(await db.booking.count({ where: { requestKey } }), 1)
  assert.equal(await db.payment.count({ where: { bookingId: saved.id } }), mock ? 1 : 0)
  if (mock) assert.equal(retry.body.checkoutUrl, checkout.body.checkoutUrl)
  const changed = await request('/api/payments/checkout', { requestKey, create: { ...create, guestName: 'Changed payload' } })
  assert.equal(changed.status, 409)
  const key2 = randomUUID(); keys.push(key2)
  assert.equal((await request('/api/payments/checkout', { requestKey: key2, create: { ...create, passengers: 5 } })).status, 409)
  assert.equal((await request('/api/payments/checkout', { requestKey: key2, create })).status, 409)
  assert.equal((await request(`/api/payments/teya/status?ref=${saved.ref}`, undefined, false)).status, 404)
  assert.equal((await request('/api/payments/checkout', { bookingRef: saved.ref }, false)).status, 404)
  const pending = await request(`/api/payments/teya/status?ref=${saved.ref}&payment=success`)
  assert.equal(pending.status, 200); assert.equal(pending.body.paid, false)
  const [name, value] = [...jar][0] || []
  if (name) { jar.set(name, value.slice(0,-1) + (value.endsWith('a') ? 'b' : 'a')); assert.equal((await request(`/api/payments/teya/status?ref=${saved.ref}`)).status, 404); jar.set(name,value) }
  console.log('Server price, capacity, availability, duplicate checkout, changed-request rejection and private guest access: PASS')
  if (mock) {
    assert.ok(process.env.CUSTOMER_TEST_STATE_FILE)
    const payment = await db.payment.findFirstOrThrow({ where: { bookingId: saved.id } })
    await writeFile(process.env.CUSTOMER_TEST_STATE_FILE, JSON.stringify({ [payment.providerRef]: { session_status: 'COMPLETED', payment_status: 'SUCCESS' } }))
    const paid = await request(`/api/payments/teya/status?ref=${saved.ref}`)
    assert.equal(paid.body.paid, true)
    assert.equal((await db.booking.findUniqueOrThrow({ where: { id: saved.id } })).status, 'CONFIRMED')
    assert.equal((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status, 'CAPTURED')
    assert.equal((await request(`/api/payments/teya/status?ref=${saved.ref}`)).body.paid, true)
    console.log('Simulated gateway confirmation persists capture exactly once: PASS (no real provider call)')
  } else console.log('Missing credentials keep one saved unpaid booking without a payment record: PASS')
} finally {
  const bookings = await db.booking.findMany({ where: { requestKey: { in: keys } }, select: { id: true, ref: true } })
  const ids = bookings.map(b => b.id), refs = bookings.map(b => b.ref)
  await db.emailNotice.deleteMany({ where: { bookingId: { in: ids } } })
  await db.staffNotification.deleteMany({ where: { bookingRef: { in: refs } } })
  await db.message.deleteMany({ where: { bookingId: { in: ids } } })
  await db.payment.deleteMany({ where: { bookingId: { in: ids } } })
  await db.booking.deleteMany({ where: { id: { in: ids } } })
  if (route) await db.route.delete({ where: { id: route.id } })
  if (vehicle) await db.vehicle.delete({ where: { id: vehicle.id } })
  await db.$disconnect()
  console.log('Temporary checkout fixtures removed.')
}
