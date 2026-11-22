import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import type { PrismaClient } from '@prisma/client'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { createDriverAccount, emailDriverLogin } from './driver-accounts'
import { hashAccountPassword, verifyAccountPassword } from './password'
import { createAuthentication } from './config'
import type { sendMail } from '@/lib/email/mailer'

type Row = { id: string; [key: string]: unknown }
function fixture() {
  let state = { users: [] as Row[], drivers: [] as Row[], identities: [] as Row[], accounts: [] as Row[], notices: [] as Row[], sessions: [] as Row[], verifications: [] as Row[] }
  let sequence = 0, delivery = true
  const sent: Parameters<typeof sendMail>[0][] = []
  const emailMatches = (row: Row, where: { email?: { equals: string } }) => row.email === where.email?.equals
  const tx = {
    user: {
      findFirst: async ({ where }: { where: { email: { equals: string } } }) => state.users.find(row => emailMatches(row, where)) || null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const { driver, ...dataWithoutDriver } = data
        const user = { id: `user-${++sequence}`, authId: null, ...dataWithoutDriver }
        state.users.push(user)
        const driverRow = { id: `driver-${sequence}`, userId: user.id, ...(driver as { create: Record<string, unknown> }).create }
        state.drivers.push(driverRow)
        return { ...user, driver: driverRow }
      },
    },
    driver: { findUnique: async ({ where }: { where: { id: string } }) => { const driver = state.drivers.find(row => row.id === where.id); return driver ? { ...driver, user: state.users.find(row => row.id === driver.userId) } : null } },
    authIdentity: {
      findFirst: async ({ where }: { where: { email?: { equals: string }; OR?: { appUserId?: string; email?: { equals: string } }[] } }) => state.identities.find(row => where.OR ? where.OR.some(filter => filter.appUserId ? row.appUserId === filter.appUserId : emailMatches(row, filter)) : emailMatches(row, where)) || null,
      create: async ({ data }: { data: Row }) => { const identity = { disabled: false, createdAt: new Date(), updatedAt: new Date(), ...data }; state.identities.push(identity); return identity },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => Object.assign(state.identities.find(row => row.id === where.id)!, data),
    },
    authAccount: {
      findFirst: async ({ where }: { where: { userId: string; providerId: string } }) => state.accounts.find(row => row.userId === where.userId && row.providerId === where.providerId) || null,
      create: async ({ data }: { data: Row }) => { state.accounts.push(data); return data },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => Object.assign(state.accounts.find(row => row.id === where.id)!, data),
    },
    authSession: { deleteMany: async ({ where }: { where: { userId: string } }) => { state.sessions = state.sessions.filter(row => row.userId !== where.userId) } },
    authVerification: { deleteMany: async ({ where }: { where: { value: string; identifier: { startsWith: string } } }) => { state.verifications = state.verifications.filter(row => row.value !== where.value || !String(row.identifier).startsWith(where.identifier.startsWith)) } },
    emailNotice: {
      findFirst: async ({ where }: { where: { dedupeKey: { startsWith: string }; status: string; createdAt: { gt: Date } } }) => state.notices.find(row => String(row.dedupeKey).startsWith(where.dedupeKey.startsWith) && row.status === where.status && (row.createdAt as Date) > where.createdAt.gt) || null,
      create: async ({ data }: { data: Record<string, unknown> }) => { const row = { id: `notice-${++sequence}`, createdAt: new Date(), ...data }; state.notices.push(row); return row },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => Object.assign(state.notices.find(row => row.id === where.id)!, data),
    },
  }
  const db = { ...tx, $transaction: async (run: (tx: unknown) => Promise<unknown>) => { const before = structuredClone(state); try { return await run(tx) } catch (error) { state = before; throw error } } } as unknown as PrismaClient
  return { state: () => state, sent, failDelivery: () => { delivery = false }, recoverDelivery: () => { delivery = true }, deps: { db, hash: hashAccountPassword, send: async (input: Parameters<typeof sendMail>[0]) => { sent.push(input); return delivery ? { ok: true as const } : { ok: false as const, message: 'private SMTP details must not be stored or returned' } } } }
}
const originalUrl = process.env.NEXT_PUBLIC_APP_URL
afterEach(() => { if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = originalUrl })
const input = { displayName: 'Fixture Driver', email: 'DRIVER@example.test', phone: '+3547771234', active: true }

test('admin provisioned driver can sign in using emailed credentials; customer signup remains available', async () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://taxi.example'
  const f = fixture(), result = await createDriverAccount(input, f.deps), state = f.state()
  assert.equal(result.delivery.sent, true)
  assert.equal(state.users[0].role, 'DRIVER')
  assert.equal(state.identities[0].appUserId, state.users[0].id)
  assert.equal(state.identities[0].emailVerified, true)
  const password = f.sent[0].text.match(/Initial password: ([^\n]+)/)![1]
  assert(password.length >= 20)
  assert(await verifyAccountPassword({ hash: String(state.accounts[0].password), password }))
  assert(!JSON.stringify({ result, state }).includes(password))
  assert(f.sent[0].html.includes('https://taxi.example/driver-login'))
  const memory = { AuthIdentity: structuredClone(state.identities), AuthAccount: structuredClone(state.accounts), AuthSession: [], AuthVerification: [], AuthRateLimit: [] }
  const emails: string[] = []
  const auth = createAuthentication({ database: memoryAdapter(memory), baseURL: 'https://taxi.example', secret: 'fixture-auth-signing-secret-at-least-32-characters', isDisabled: async () => false, canSelfRegister: async email => !['reserved-driver@example.test', 'reserved-staff@example.test'].includes(email), sendLink: async email => { emails.push(email) }, sendCode: async email => { emails.push(email) } })
  const request = (path: string, body: object) => auth.handler(new Request(`https://taxi.example/api/auth${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://taxi.example' }, body: JSON.stringify(body) }))
  const login = await request('/sign-in/email', { email: 'driver@example.test', password })
  assert.equal(login.status, 200, 'Generated credentials work with actual Better Auth')
  assert(login.headers.getSetCookie().length > 0)
  assert.equal((await request('/sign-in/email', { email: 'driver@example.test', password: 'wrong-password' })).status, 401)
  for (const email of ['reserved-driver@example.test', 'reserved-staff@example.test']) {
    const response = await request('/sign-up/email', { email, password: 'Fixture signup password!', name: 'Fixture' })
    // Better Auth deliberately hides reserved/duplicate emails behind a synthetic success response.
    assert.equal(response.status, 200)
    assert.equal((await response.json()).token, null)
    assert(!memory.AuthIdentity.some(row => row.email === email))
    assert(!emails.includes(email))
  }
  const signup = await request('/sign-up/email', { email: 'customer@example.test', password: 'Fixture signup password!', name: 'Customer', role: 'DRIVER' })
  assert.equal(signup.status, 200)
  assert(emails.includes('customer@example.test'))
  const customer = memory.AuthIdentity.find(row => row.email === 'customer@example.test')!
  assert.equal(customer.emailVerified, false)
  assert.equal(customer.appUserId ?? null, null)
  assert.equal(customer.role, undefined)
})

test('duplicate creation cannot replace another account; failed email is reported without credential leakage', async () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://taxi.example'
  const f = fixture()
  f.failDelivery()
  const result = await createDriverAccount(input, f.deps)
  assert.equal(result.delivery.sent, false)
  assert.equal(f.state().notices[0].status, 'failed')
  assert.doesNotMatch(String(f.state().notices[0].error), /private SMTP/)
  const before = structuredClone(f.state())
  await assert.rejects(createDriverAccount(input, f.deps), error => (error as { status: number }).status === 409)
  assert.deepEqual(f.state(), before)
  assert.equal(f.sent.length, 1)
  f.recoverDelivery()
  const retried = await emailDriverLogin(result.driver!.id, f.deps)
  assert.equal(retried.delivery.sent, true)
  const password = f.sent[1].text.match(/Initial password: ([^\n]+)/)![1]
  assert(!JSON.stringify({ retried, state: f.state() }).includes(password))
  assert.equal(f.state().users[0].id, before.users[0].id)
  assert.equal(f.state().drivers[0].id, before.drivers[0].id)
  assert.equal(f.state().identities[0].id, before.identities[0].id)
})

test('emailing new login revokes prior credentials/sessions; inactive drivers and other roles are rejected', async () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://taxi.example'
  const f = fixture(), created = await createDriverAccount(input, f.deps)
  const firstPassword = f.sent[0].text.match(/Initial password: ([^\n]+)/)![1]
  const identityId = f.state().identities[0].id
  f.state().sessions.push({ id: 'old-session', userId: identityId })
  f.state().verifications.push({ id: 'old-reset', value: identityId, identifier: 'reset-password:old-token' })
  await emailDriverLogin(created.driver!.id, f.deps)
  assert.equal(f.state().sessions.length, 0)
  assert.equal(f.state().verifications.length, 0)
  assert(!await verifyAccountPassword({ hash: String(f.state().accounts[0].password), password: firstPassword }))
  f.state().drivers[0].active = false
  await assert.rejects(emailDriverLogin(created.driver!.id, f.deps), error => (error as { status: number }).status === 409)
  f.state().drivers[0].active = true
  f.state().users[0].role = 'CUSTOMER'
  await assert.rejects(emailDriverLogin(created.driver!.id, f.deps), error => (error as { status: number }).status === 404)
  assert.equal(f.sent.length, 2)
})

test('in-flight delivery and conflicting identity links cannot overwrite credentials', async () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://taxi.example'
  for (const conflict of ['sending', 'identity']) {
    const f = fixture(), created = await createDriverAccount(input, f.deps)
    if (conflict === 'sending') f.state().notices[0].status = 'sending'
    else f.state().identities[0].appUserId = 'another-business-user'
    const before = structuredClone(f.state())
    await assert.rejects(emailDriverLogin(created.driver!.id, f.deps), error => (error as { status: number }).status === 409)
    assert.deepEqual(f.state(), before)
    assert.equal(f.sent.length, 1)
  }
})

test('operations can provision an existing driver profile while preserving business and legacy identity IDs', async () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://taxi.example'
  const f = fixture(), legacyId = '22222222-2222-4222-8222-222222222222'
  f.state().users.push({ id: 'existing-user', authId: legacyId, email: 'existing@example.test', name: 'Existing Driver', role: 'DRIVER' })
  f.state().drivers.push({ id: 'existing-driver', userId: 'existing-user', active: true, status: 'Available' })
  const before = structuredClone({ users: f.state().users, drivers: f.state().drivers })
  const result = await emailDriverLogin('existing-driver', f.deps)
  assert.equal(result.delivery.sent, true)
  assert.deepEqual({ users: f.state().users, drivers: f.state().drivers }, before)
  assert.equal(f.state().identities[0].id, legacyId)
  assert.equal(f.state().identities[0].appUserId, 'existing-user')
})
