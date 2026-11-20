// Actual HTTP handlers with isolated dependencies: no database or external email.
// node --experimental-vm-modules scripts/check-driver-admin-routes.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { z } from 'zod'

async function fixture(path) {
  let denied = false, smtpMissing = false, calls = 0
  const budgets = []
  const context = vm.createContext({ Request, Response, process: { env: { DATABASE_URL: 'fixture-only' } } })
  const jsonError = (status, code, message) => Response.json({ ok: false, code, message }, { status })
  const dependencies = {
    zod: { z },
    '@/lib/api': { apiHandler: handler => handler, jsonError, jsonOk: (data, init) => Response.json(data, init) },
    '@/lib/auth/admin-access': { rejectDriverOnly: async module => { assert.equal(module, 'drivers'); return denied ? jsonError(403, 'FORBIDDEN', 'Staff permission required') : null } },
    '@/lib/email/mailer': { mailConfigError: () => smtpMissing ? 'SMTP unavailable' : null },
    '@/lib/security/rate-limit': { rateLimit: async (...args) => { budgets.push(args) } },
    '@/lib/auth/driver-accounts': {
      createDriverAccount: async input => { calls++; assert.equal(input.email, 'driver@example.invalid'); return { driver: { id: 'driver-fixture' }, delivery: { sent: false } } },
      emailDriverLogin: async id => { calls++; assert.equal(id, 'driver-fixture'); return { delivery: { sent: true } } },
    },
  }
  const source = await readFile(new URL(`../src/app/api/admin/drivers/${path}`, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const route = new vm.SourceTextModule(compiled, { context })
  await route.link(name => { const exports = dependencies[name]; assert(exports, name); return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value) }, { context }) })
  await route.evaluate()
  return {
    request: body => route.namespace.POST(new Request('https://taxi.example/api/admin/drivers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) }), { params: Promise.resolve({ id: 'driver-fixture' }) }),
    deny: value => { denied = value }, mailMissing: value => { smtpMissing = value }, calls: () => calls, budgets,
  }
}

for (const path of ['route.ts', '[id]/login/route.ts']) {
  const f = await fixture(path)
  f.deny(true)
  assert.equal((await f.request()).status, 403)
  assert.equal(f.calls(), 0)
  assert.equal(f.budgets.length, 0)
  f.deny(false); f.mailMissing(true)
  assert.equal((await f.request({ displayName: 'Fixture', email: 'driver@example.invalid' })).status, 503)
  assert.equal(f.calls(), 0)
  f.mailMissing(false)
  if (path === 'route.ts') {
    assert.equal((await f.request({ displayName: 'Fixture', email: 'driver@example.invalid', role: 'SUPER_ADMIN', password: 'not-accepted' })).status, 400)
    const response = await f.request({ displayName: 'Fixture', email: 'driver@example.invalid' })
    assert.equal(response.status, 201)
    const body = await response.json()
    assert.equal(body.delivery.sent, false)
    assert.match(body.message, /could not be confirmed/)
    assert.deepEqual(Object.keys(body).sort(), ['delivery', 'driver', 'message', 'ok'])
  } else {
    const response = await f.request()
    assert.equal(response.status, 200)
    assert.equal((await response.json()).delivery.sent, true)
    assert.deepEqual(f.budgets, [['driver-login-email', 'driver-fixture', 3, 900000]])
  }
  assert.equal(f.calls(), 1)
}
console.log('Driver admin endpoints passed: permission gate before side effects, SMTP preflight, strict input, explicit delivery status and resend rate limit; no database or external email.')
