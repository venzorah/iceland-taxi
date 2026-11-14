// Local admin verification; outbound SMTP, WhatsApp, push and payment delivery must be disabled.
import nextEnv from '@next/env'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { randomUUID,randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'
nextEnv.loadEnvConfig(process.cwd())
const origin=process.argv[2]||'http://127.0.0.1:3106'
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw new Error('Local server required')
const connection=new URL(process.env.DIRECT_URL||process.env.DATABASE_URL);connection.searchParams.set('connection_limit','1');connection.searchParams.set('connect_timeout','30')
const db=new PrismaClient({datasourceUrl:connection.toString()})
const auth=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const run=randomUUID(),accounts=[],refs=[],bookingIds=[]
let vehicle,service,destination,driverUser,payment
async function account(role){
 const email=`admin-check-${role.toLowerCase()}-${run}@example.invalid`,password=randomBytes(32).toString('base64url')
 const identity=await auth.auth.admin.createUser({email,password,email_confirm:true});if(identity.error)throw new Error('Temporary Auth creation failed')
 const a={identity:identity.data.user.id,email,jar:new Map()};accounts.push(a)
 a.user=await db.user.create({data:{email,authId:a.identity,role,name:`Verification ${role}`}})
 const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[...a.jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>a.jar.set(name,value))}})
 if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Temporary sign-in failed')
 return a
}
async function request(a,path,method='GET',body,attempt=0){
 const response=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',Cookie:[...a.jar].map(([k,v])=>`${k}=${v}`).join('; ')},body:body?JSON.stringify(body):undefined})
 const data=await response.json()
 if(response.status===503&&method==='GET'&&attempt<2)return request(a,path,method,body,attempt+1)
 return {status:response.status,body:data}
}
async function booking(slot=0){
 const ref=`AV-${randomUUID().slice(0,20)}`,pickupAt=new Date(Date.now()+8*86400000+slot*3*3600000);refs.push(ref)
 const b=await db.booking.create({data:{ref,serviceLabel:'Admin verification',routeLabel:'Verification pickup → Verification destination',status:'CONFIRMED',currency:'ISK',amountSnapshot:1000,vehicleId:vehicle.id,pickupAt,endsAt:new Date(pickupAt.getTime()+3600000),durationMinutes:60,guestEmail:`passenger-${run}@example.invalid`,passengers:1,luggage:1}});bookingIds.push(b.id);return b
}
try{
 const superadmin=await account('SUPER_ADMIN'),manager=await account('BOOKING_MANAGER'),finance=await account('FINANCE_MANAGER'),content=await account('CONTENT_MANAGER'),staff=await account('STAFF')
 const matrix=[
 [manager,'/api/bookings',200],[manager,'/api/drivers',200],[manager,'/api/admin/payments',403],[manager,'/api/admin/staff',403],[manager,'/api/admin/services',403],
 [finance,'/api/admin/payments',200],[finance,'/api/bookings',403],[finance,'/api/messages?as=staff',401],[finance,'/api/admin/workspace?section=reports',200],[finance,'/api/admin/workspace?section=customers',403],
 [content,'/api/admin/services',200],[content,'/api/drivers',403],[content,'/api/admin/workspace?section=reviews',200],[content,'/api/admin/workspace?section=customers',403],
 [staff,'/api/bookings',200],[staff,'/api/admin/staff',403],[staff,'/api/admin/services',403]]
 for(const [a,path,status] of matrix){const result=await request(a,path);assert.equal(result.status,status,`${a.user.role} ${path}: ${result.status}`)}
 const reports=await request(finance,'/api/admin/workspace?section=reports');assert.equal('customers' in reports.body,false);assert.equal('settings' in reports.body,false)
 const overview=await request(superadmin,'/api/admin/overview');assert.equal(overview.status,200);assert.ok(Array.isArray(overview.body.drivers));assert.ok(Array.isArray(overview.body.totals))
 console.log('All five staff roles, private section projections and database overview: PASS')
 const v=await request(manager,'/api/admin/vehicles','POST',{name:`Verification ${run}`,category:'Test',pax:3,bags:3,upgradeIsk:0});assert.equal(v.status,201);vehicle=v.body.vehicle
 const d=await request(manager,'/api/admin/drivers','POST',{displayName:`Verification ${run}`,email:`driver-${run}@example.invalid`});assert.equal(d.status,201)
 driverUser=await db.user.findUniqueOrThrow({where:{email:`driver-${run}@example.invalid`},include:{driver:true}})
 assert.equal(driverUser.role,'DRIVER')
 const s=await request(content,'/api/admin/services','POST',{slug:`verify-${run}`,kind:'TOUR',titleEn:`Verification ${run}`,fromIsk:10000,active:false});assert.equal(s.status,201);service=s.body.service
 const dest=await request(content,'/api/admin/destinations','POST',{name:`Verification ${run}`,active:false});assert.equal(dest.status,201);destination=dest.body.destination
 assert.equal((await request(manager,'/api/admin/services','POST',{slug:'forbidden',kind:'TOUR',titleEn:'Forbidden'})).status,403)
 const own=await booking(),conflict=await booking(),later=await booking(1)
 // Test the driver conflict without pre-reserving the first journey's car.
 await db.booking.update({where:{id:conflict.id},data:{vehicleId:null}})
 const patch=(ref,body)=>request(manager,`/api/bookings/${ref}`,'PATCH',body)
 assert.equal((await patch(own.ref,{expectedStatus:'CONFIRMED',driverId:driverUser.driver.id})).status,200)
 assert.equal((await patch(conflict.ref,{expectedStatus:'CONFIRMED',driverId:driverUser.driver.id})).status,409)
 assert.equal((await patch(own.ref,{expectedStatus:'CONFIRMED',notes:'Stale update'})).status,409)
 assert.equal((await patch(later.ref,{expectedStatus:'CONFIRMED',status:'REFUNDED'})).status,409)
 await db.driver.update({where:{id:driverUser.driver.id},data:{active:false}})
 assert.equal((await patch(later.ref,{expectedStatus:'CONFIRMED',driverId:driverUser.driver.id})).status,409)
 await db.driver.update({where:{id:driverUser.driver.id},data:{active:true}})
 payment=await db.payment.create({data:{bookingId:own.id,provider:'teya',providerRef:`verification-${run}`,status:'CAPTURED',currency:'ISK',amount:1000}})
 assert.equal((await request(finance,`/api/admin/payments/${payment.id}`,'PATCH',{status:'REFUNDED'})).status,409)
 assert.equal((await db.payment.findUniqueOrThrow({where:{id:payment.id}})).status,'CAPTURED')
 assert.equal((await patch(own.ref,{expectedStatus:'DRIVER_ASSIGNED',status:'CANCELLED'})).body.booking.status,'REFUND_REQUESTED')
 assert.equal((await request(manager,`/api/bookings/${own.ref}`,'DELETE')).status,409)
 assert.ok(await db.booking.findUnique({where:{id:own.id}}))
 console.log('Live catalogue/fleet creation, role-protected writes, assignment overlap/stale/inactive checks, paid review and retained payment history: PASS')
 if(process.env.CHROME_DEBUG_URL){const {verifyAdminBrowser}=await import('./admin-browser-check.mjs');await verifyAdminBrowser(superadmin.jar,finance.jar,origin)}
}catch(error){console.error('Admin verification failed:',error.stack);process.exitCode=1}
finally{
 await db.emailNotice.deleteMany({where:{OR:[{bookingId:{in:bookingIds}},{toEmail:{contains:run}},...(driverUser?[{dedupeKey:{contains:driverUser.id}}]:[])]}})
 await db.staffNotification.deleteMany({where:{bookingRef:{in:refs}}})
 await db.message.deleteMany({where:{bookingId:{in:bookingIds}}})
 await db.payment.deleteMany({where:{bookingId:{in:bookingIds}}})
 await db.booking.deleteMany({where:{id:{in:bookingIds}}})
 if(driverUser)await db.user.delete({where:{id:driverUser.id}})
 if(vehicle)await db.vehicle.delete({where:{id:vehicle.id}})
 if(service)await db.service.delete({where:{id:service.id}})
 if(destination)await db.destination.delete({where:{id:destination.id}})
 for(const a of accounts){if(a.user)await db.user.delete({where:{id:a.user.id}});if((await auth.auth.admin.deleteUser(a.identity)).error){console.error('Temporary Auth cleanup needs retry');process.exitCode=1}}
 await db.$disconnect();console.log('Temporary admin verification records removed.')
}
