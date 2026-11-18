// Developer test setup only. Requires two NEW, empty, explicitly named local databases.
// Apply the first six schema migrations to source_fixture and all seven to the target first.
// No database is reset, truncated or dropped by this tool. It refuses existing application rows.
import {PrismaClient,type Role} from '@prisma/client'
import bcrypt from 'bcryptjs'
if(!process.argv.includes('--create-synthetic-fixtures'))throw new Error('Explicit synthetic-fixture flag required')
function fixtureURL(name:string,value:string|undefined){
 if(!value)throw new Error('Explicit fixture URLs are required')
 const url=new URL(value)
 if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/'+name)throw new Error('Only named loopback fixture databases are allowed')
 return value
}
const source=new PrismaClient({datasourceUrl:fixtureURL('source_fixture',process.env.AUTH_FIXTURE_SOURCE_URL),log:[]})
const target=new PrismaClient({datasourceUrl:fixtureURL('iceland_taxi_rehearsal',process.env.AUTH_FIXTURE_TARGET_URL),log:[]})
async function assertEmpty(db:PrismaClient,name:string){
 const [info]=await db.$queryRaw<{name:string}[]>`SELECT current_database() AS name`
 if(info.name!==name)throw new Error('Unexpected fixture database')
 await db.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
  await tx.$executeRawUnsafe('SET LOCAL row_security=off')
  const tables=await tx.$queryRaw<{tablename:string}[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations'`
  for(const {tablename} of tables){
   const identifier='"'+tablename.replaceAll('"','""')+'"'
   const [row]=await tx.$queryRawUnsafe<{count:bigint}[]>(`SELECT count(*) AS count FROM public.${identifier}`)
   if(Number(row.count))throw new Error('Refusing fixtures in a nonempty application database')
  }
 })
}
async function main(){
 await assertEmpty(source,'source_fixture');await assertEmpty(target,'iceland_taxi_rehearsal')
 await source.$executeRawUnsafe('CREATE SCHEMA auth')
 await source.$executeRawUnsafe('CREATE TABLE auth.users (id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,encrypted_password text,created_at timestamptz,updated_at timestamptz,banned_until timestamptz,deleted_at timestamptz,is_anonymous boolean DEFAULT false)')
 await source.$executeRawUnsafe('CREATE TABLE auth.identities (user_id uuid REFERENCES auth.users(id),provider text)')
 const timestamp=new Date('2025-01-01T12:00:00Z'),hash=await bcrypt.hash('Preserved fixture password!',4)
 for(const [i,role] of ['CUSTOMER','SUPER_ADMIN','DRIVER','CUSTOMER','CUSTOMER','CUSTOMER'].entries()){
  const id=`11111111-1111-4111-8111-${String(i+1).padStart(12,'0')}`,email=`migrated-${i+1}@example.invalid`
  await source.$executeRaw`INSERT INTO auth.users (id,email,email_confirmed_at,encrypted_password,created_at,updated_at,deleted_at) VALUES (${id}::uuid,${email},${i===4?null:timestamp},${i===3?'unsupported-fixture':hash},${timestamp},${timestamp},${i===5?timestamp:null})`
  await source.$executeRaw`INSERT INTO auth.identities (user_id,provider) VALUES (${id}::uuid,'email')`
  const user=await source.user.create({data:{id:`original-user-${i+1}`,email,authId:id,role:role as Role,name:`Fixture ${i+1}`,createdAt:timestamp,updatedAt:timestamp}})
  await target.user.create({data:user})
 }
 const staff=await source.staffProfile.create({data:{id:'original-staff',userId:'original-user-2',active:true}});await target.staffProfile.create({data:staff})
 const driver=await source.driver.create({data:{id:'original-driver',userId:'original-user-3',displayName:'Fixture driver',createdAt:timestamp,updatedAt:timestamp}});await target.driver.create({data:driver})
 const booking=await source.booking.create({data:{id:'original-booking',ref:'FIXTURE-RESTORED',customerId:'original-user-1',driverId:driver.id,status:'DRIVER_ASSIGNED',serviceLabel:'Fixture',routeLabel:'Fixture pickup → destination',currency:'ISK',amountSnapshot:1000,createdAt:timestamp,updatedAt:timestamp}});await target.booking.create({data:booking})
 const payment=await source.payment.create({data:{id:'original-payment',bookingId:booking.id,status:'PENDING',currency:'ISK',amount:1000,providerRef:'synthetic-session',raw:{environment:'production',fixture:true},createdAt:timestamp,updatedAt:timestamp}});await target.payment.create({data:payment})
 const message=await source.message.create({data:{id:'original-message',bookingId:booking.id,authorId:'original-user-1',body:'Synthetic restored message',createdAt:timestamp}});await target.message.create({data:message})
 console.log('Synthetic source and restored-target business fixtures created; original IDs/timestamps preserved')
}
void main().catch(error=>{console.error(error.code||error.name);process.exitCode=1}).finally(async()=>{await source.$disconnect();await target.$disconnect()})
