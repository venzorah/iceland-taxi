// Execute actual route handlers against an isolated in-memory Prisma test double.
// No environment file, database, external upload, payment or notification is accessed.
// Run: node --experimental-vm-modules scripts/check-admin-deletions.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { z } from 'zod'
import { Prisma, ServiceKind } from '@prisma/client'

function fixture() {
  return { service: [{ id: 'service', active: true }], route: [{ id: 'route', serviceId: 'service' }], booking: [{ id: 'booking', serviceId: 'service', routeId: 'route', driverId: 'driver', status: 'CONFIRMED', serviceLabel: 'Saved service', routeLabel: 'Saved journey', amountSnapshot: 100, pickupAt: '2030-01-01T10:00:00Z' }], vehicle: [{ id: 'vehicle', active: true }], driver: [{ id: 'driver', active: true, status: 'Available' }], destination: [{ id: 'destination' }], mediaAsset: [{ id: 'image', archived: false, url: 'https://example.invalid/image.jpg' }], payment: [{ id: 'payment', bookingId: 'booking', amount: 100 }] }
}
async function handler(kind) {
  let state = fixture(), writes = 0, deny = false, failDelete = false
  const matches = (row, where) => Object.entries(where || {}).every(([key, value]) => typeof value === 'object' && value !== null ? value.in?.includes(row[key]) : row[key] === value)
  const db = {}
  for (const model of Object.keys(state)) {
    db[model] = {
      findUnique: async ({ where }) => state[model].find(row => matches(row, where)) || null,
      findFirst: async ({ where }) => state[model].find(row => matches(row, where)) || null,
      count: async ({ where }) => state[model].filter(row => matches(row, where)).length,
      updateMany: async ({ where, data }) => { writes++; for (const row of state[model].filter(row => matches(row, where))) Object.assign(row, data); return { count: 1 } },
      update: async ({ where, data }) => { const row = state[model].find(row => matches(row, where)); if (!row) throw Object.assign(Error('missing'), { code: 'P2025' }); writes++; Object.assign(row, data); return row },
      delete: async ({ where }) => { if (failDelete) throw Object.assign(Error('connection failure'), { code: 'P1001' }); const row = state[model].find(row => matches(row, where)); if (!row) throw Object.assign(Error('missing'), { code: 'P2025' }); writes++; state[model] = state[model].filter(item => item !== row); return row },
    }
  }
  db.$transaction = async task => { const before = structuredClone(state); try { return await task(db) } catch (error) { state = before; throw error } }
  const jsonOk = data => Response.json(data)
  const jsonError = (status, code, message) => Response.json({ ok: false, code, message }, { status })
  const context = vm.createContext({ Request, Response, process: { env: { DATABASE_URL: 'fixture-only' } }, console })
  const modules = {
    '@/lib/api': { prisma: db, jsonOk, jsonError, apiHandler: fn => fn },
    '@/lib/auth/admin-access': { rejectDriverOnly: async () => deny ? jsonError(403, 'FORBIDDEN', 'Staff access required') : null },
    '@prisma/client': { Prisma, ServiceKind }, zod: { z },
    '@/lib/media/form': { imageForm: () => { throw Error('Uploads must never run') }, UploadInputError: class extends Error {} },
    '@/lib/media/cloudinary': { uploadImage: () => { throw Error('Cloudinary must never run') } },
    '@/lib/media/library': { mediaView: value => value },
  }
  const source = await readFile(new URL(`../src/app/api/admin/${kind}/[id]/route.ts`, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const route = new vm.SourceTextModule(compiled, { context })
  await route.link(specifier => { const exports = modules[specifier]; if (!exports) throw Error('Unexpected dependency: ' + specifier); return new vm.SyntheticModule(Object.keys(exports), function () { for (const [name, value] of Object.entries(exports)) this.setExport(name, value) }, { context }) })
  await route.evaluate()
  return { invoke: id => route.namespace.DELETE(new Request('https://example.invalid/api/admin/' + kind + '/' + id, { method: 'DELETE' }), { params: Promise.resolve({ id }) }), state: () => structuredClone(state), writes: () => writes, deny: () => { deny = true }, fail: () => { failDelete = true }, busy: () => { state.booking[0].status = 'IN_PROGRESS' } }
}
for (const [kind, id] of [['services', 'service'], ['routes', 'route'], ['destinations', 'destination'], ['vehicles', 'vehicle'], ['drivers', 'driver'], ['library', 'image']]) {
  const h = await handler(kind), before = h.state(), r = await h.invoke(id)
  assert.equal(r.status, 200); assert.equal((await r.json()).ok, true)
  const after = h.state()
  if (kind === 'services') { assert.equal(after.service.length, 0); assert.equal(after.route[0].serviceId, null); assert.equal(after.booking[0].serviceId, null) }
  if (kind === 'routes') { assert.equal(after.route.length, 0); assert.equal(after.booking[0].routeId, null) }
  if (kind === 'destinations') assert.equal(after.destination.length, 0)
  if (kind === 'vehicles') assert.equal(after.vehicle[0].active, false)
  if (kind === 'drivers') { assert.equal(after.driver[0].active, false); assert.equal(after.driver[0].status, 'Suspended') }
  if (kind === 'library') { assert.equal(after.mediaAsset[0].archived, true); assert.equal(after.mediaAsset[0].url, before.mediaAsset[0].url) }
  assert.equal(after.booking.length, 1); assert.deepEqual(after.payment, before.payment)
  for (const field of ['serviceLabel', 'routeLabel', 'amountSnapshot', 'pickupAt']) assert.equal(after.booking[0][field], before.booking[0][field])
  assert.equal((await h.invoke('unknown')).status, 404)
  const blocked = await handler(kind); blocked.deny(); assert.equal((await blocked.invoke(id)).status, 403); assert.equal(blocked.writes(), 0)
  console.log(`${kind}: delete/archive, missing record, permission denial and retained booking/payment history passed`)
}
for (const kind of ['services', 'routes']) {
  const h = await handler(kind), before = h.state(); h.fail()
  await assert.rejects(h.invoke(kind === 'services' ? 'service' : 'route'), error => error.code === 'P1001')
  assert.deepEqual(h.state(), before)
  console.log(`${kind}: transaction rolls back detached links when deletion fails`)
}
const driver = await handler('drivers'); driver.busy(); const before = driver.state(); assert.equal((await driver.invoke('driver')).status, 409); assert.deepEqual(driver.state(), before)
console.log('drivers: archiving an in-progress journey is refused without changing history')
