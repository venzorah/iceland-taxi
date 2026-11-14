// Isolated local server only. Disable SMTP, WhatsApp and VAPID before running.
import nextEnv from '@next/env'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { randomUUID, randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'
nextEnv.loadEnvConfig(process.cwd())
const origin = process.argv[2] || 'http://127.0.0.1:3105'
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local server required')
const connection = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL)
connection.searchParams.set('connection_limit','1'); connection.searchParams.set('connect_timeout','30'); connection.searchParams.set('pool_timeout','30')
const db = new PrismaClient({ datasourceUrl: connection.toString() })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const run = randomUUID()
const accounts = [], refs = [], ids = []
async function account(label, role) {
  const email = `driver-check-${label}-${run}@example.invalid`, password = randomBytes(32).toString('base64url')
  const result = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (result.error) throw new Error(`Temporary ${label} identity creation failed`)
  const jar = new Map()
  const fixture = { identity: result.data.user.id, email, jar }; accounts.push(fixture)
  fixture.user = await db.user.create({ data: { email, authId: fixture.identity, name: `Verification ${label}`, role, ...(role === 'DRIVER' ? { driver: { create: { displayName: `Verification ${label}`, active: true } } } : {}) }, include: { driver: true } })
  fixture.client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll: () => [...jar].map(([name,value]) => ({ name,value })), setAll: values => values.forEach(({ name,value }) => jar.set(name,value)) } })
  if ((await fixture.client.auth.signInWithPassword({ email,password })).error) throw new Error(`Temporary ${label} login failed`)
  return fixture
}
async function request(actor, path, method = 'GET', body, attempt = 0) {
  const response = await fetch(origin + path, { method, headers: { 'Content-Type': 'application/json', Cookie: [...actor.jar].map(([k,v]) => `${k}=${v}`).join('; ') }, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json()
  if (response.status === 503 && (method === 'GET' || (method === 'PATCH' && body?.expectedStatus)) && attempt < 2) return request(actor,path,method,body,attempt+1)
  return { status: response.status, body: data }
}
async function booking(driverId, customerId, status = 'DRIVER_ASSIGNED', slot = 0) {
  const ref = `DV-${randomUUID().slice(0,20)}`; refs.push(ref)
  const pickupAt = new Date(Date.now() + 7 * 86400000 + slot * 3 * 3600000)
  const result = await db.booking.create({ data: { ref, driverId, customerId, serviceLabel: 'Temporary driver verification', routeLabel: 'Verification pickup → Verification destination', pickupAt, endsAt: new Date(pickupAt.getTime()+3600000), durationMinutes: 60, currency: 'ISK', amountSnapshot: 1000, status, guestName: 'Temporary passenger', guestEmail: accounts.find(a => a.user?.id === customerId)?.email } })
  ids.push(result.id); return result
}
try {
  const driver = await account('one','DRIVER'), other = await account('two','DRIVER'), staff = await account('operations','SUPER_ADMIN'), customer = await account('passenger','CUSTOMER')
  assert.equal((await request(driver,'/api/driver/bookings')).body.jobs.length,0)
  const own = await booking(driver.user.driver.id,customer.user.id), foreign = await booking(other.user.driver.id,customer.user.id), later = await booking(driver.user.driver.id,customer.user.id,'DRIVER_ASSIGNED',1)
  const list = await request(driver,'/api/driver/bookings')
  assert.equal(list.status,200); assert.deepEqual(new Set(list.body.jobs.map(j => j.ref)),new Set([own.ref,later.ref]))
  if (process.env.CHROME_DEBUG_URL) { const { verifyDriverBrowser } = await import('./driver-browser-check.mjs'); await verifyDriverBrowser(driver.jar,origin) }
  assert.equal((await request(customer,'/api/driver/bookings')).status,401)
  assert.equal((await request(driver,'/api/admin/drivers','POST',{ displayName:'Forbidden',email:'forbidden@example.invalid' })).status,403)
  const patch = (actor,ref,state) => request(actor,`/api/driver/bookings/${ref}`,'PATCH',{ expectedStatus:state })
  assert.equal((await patch(driver,foreign.ref,'DRIVER_ASSIGNED')).status,404)
  assert.equal((await request(driver,`/api/driver/bookings/${own.ref}`,'PATCH',{ status:'COMPLETED' })).status,400)
  const together = await Promise.all([patch(driver,own.ref,'DRIVER_ASSIGNED'),patch(driver,own.ref,'DRIVER_ASSIGNED')])
  assert.ok(together.every(r => [200,409].includes(r.status)))
  assert.equal((await db.booking.findUniqueOrThrow({ where:{id:own.id} })).status,'ACKNOWLEDGED')
  assert.equal((await patch(driver,own.ref,'DRIVER_ASSIGNED')).body.job.status,'ACKNOWLEDGED')
  assert.equal((await patch(driver,own.ref,'ACKNOWLEDGED')).body.job.status,'DRIVER_EN_ROUTE')
  assert.equal((await db.driver.findUniqueOrThrow({ where:{id:driver.user.driver.id} })).status,'On trip')
  assert.equal((await patch(driver,later.ref,'DRIVER_ASSIGNED')).status,200)
  assert.equal((await patch(driver,later.ref,'ACKNOWLEDGED')).status,409)
  assert.equal((await request(driver,'/api/driver/me','PATCH',{displayName:'Updated driver',phone:'+354 555 0100',status:'Unavailable'})).status,409)
  assert.equal((await patch(driver,own.ref,'DRIVER_EN_ROUTE')).body.job.status,'IN_PROGRESS')
  assert.equal((await patch(driver,own.ref,'IN_PROGRESS')).body.job.status,'COMPLETED')
  assert.equal((await patch(driver,own.ref,'COMPLETED')).status,409)
  assert.equal((await db.driver.findUniqueOrThrow({ where:{id:driver.user.driver.id} })).status,'Available')
  assert.ok((await request(driver,'/api/driver/bookings')).body.history.some(j => j.ref===own.ref))
  assert.equal((await request(driver,'/api/driver/me','PATCH',{displayName:'Updated driver',phone:'+354 555 0100',role:'SUPER_ADMIN'})).status,400)
  assert.equal((await request(driver,'/api/driver/me','PATCH',{displayName:'Updated driver',phone:'+354 555 0100',status:'Unavailable'})).status,200)
  assert.equal((await db.user.findUniqueOrThrow({where:{id:driver.user.id}})).phone,'+354 555 0100')
  console.log('Driver ownership, role isolation, concurrent/repeated status requests, full journey, busy lock and profile persistence: PASS')
  const path = `/api/driver/bookings/${own.ref}/messages`
  assert.equal((await request(other,path)).status,404)
  assert.equal((await request(customer,path)).status,404)
  assert.equal((await request(driver,path,'POST',{body:'  '})).status,400)
  assert.equal((await request(driver,path,'POST',{body:'Private driver note'})).status,201)
  assert.equal((await request(driver,'/api/messages/alerts?as=driver')).body.items.length,0)
  assert.equal((await request(staff,path)).body.messages[0].body,'Private driver note')
  assert.equal((await request(customer,`/api/messages/${own.ref}?as=customer`)).body.messages.length,0)
  assert.equal((await request(staff,path,'POST',{body:'Private operations reply'})).status,201)
  assert.equal((await request(driver,'/api/messages/alerts?as=driver')).body.items.length,1)
  assert.equal((await request(driver,path)).body.messages.length,2)
  assert.equal((await request(driver,'/api/messages/alerts?as=driver')).body.items.length,0)
  assert.equal((await request(customer,`/api/messages/${own.ref}?as=customer`)).body.messages.length,0)
  await db.booking.update({where:{id:own.id},data:{driverId:other.user.driver.id}})
  assert.equal((await request(driver,path)).status,404)
  assert.equal((await request(driver,path,'POST',{body:'Old assignment'})).status,404)
  await db.driver.update({where:{id:driver.user.driver.id},data:{active:false}})
  assert.equal((await request(driver,'/api/driver/me')).body.authenticated,false)
  assert.equal((await request(driver,'/api/driver/bookings')).status,401)
  assert.equal((await patch(driver,later.ref,'ACKNOWLEDGED')).status,401)
  console.log('Private driver/operations messages, independent unread alerts, reassignment and deactivation access: PASS')
} catch(error) { console.error('Driver verification failed:',error.stack); process.exitCode=1 }
finally {
  await db.emailNotice.deleteMany({where:{bookingId:{in:ids}}})
  await db.staffNotification.deleteMany({where:{bookingRef:{in:refs}}})
  await db.message.deleteMany({where:{bookingId:{in:ids}}})
  await db.payment.deleteMany({where:{bookingId:{in:ids}}})
  await db.booking.deleteMany({where:{id:{in:ids}}})
  for(const account of accounts) { if(account.user) await db.user.delete({where:{id:account.user.id}}); const removed=await admin.auth.admin.deleteUser(account.identity); if(removed.error) { console.error('Temporary Auth cleanup needs retry'); process.exitCode=1 } }
  await db.$disconnect(); console.log('Temporary driver verification records removed.')
}
