// Local isolated test fixtures only. Never provisions or logs in a real production account.
import {PrismaClient} from '@prisma/client'
import {hashPassword} from 'better-auth/crypto'
import {randomUUID} from 'node:crypto'
let db
function fixtureDatabase(){
 const value=process.env.DIRECT_URL
 let url
 try{url=new URL(value)}catch{throw new Error('A private test database is required')}
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!/(?:_test|_rehearsal)$/.test(url.pathname))throw new Error('Refusing fixtures outside a loopback test/rehearsal database')
 if(!db)db=new PrismaClient({datasourceUrl:value,log:[]})
 return db
}
export async function createFixtureIdentity({email,password}){
 if(!email.endsWith('@example.invalid'))throw new Error('Use fixture-only email addresses')
 const prisma=fixtureDatabase(),id=randomUUID()
 await prisma.authIdentity.create({data:{id,email,name:'Temporary verification identity',emailVerified:true,accounts:{create:{id:randomUUID(),accountId:id,providerId:'credential',password:await hashPassword(password)}}}})
 return {data:{user:{id}},error:null}
}
export async function deleteFixtureIdentity(id){
 const prisma=fixtureDatabase(),identity=await prisma.authIdentity.findUnique({where:{id}})
 if(identity&&!identity.email.endsWith('@example.invalid'))throw new Error('Refusing to delete a real identity')
 await prisma.authIdentity.deleteMany({where:{id}})
 return {error:null}
}
export function fixtureSession(origin,jar){
 if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Loopback application required')
 const fixtureIp=`2001:db8::${randomUUID().slice(0,4)}`
 async function request(path,body){
  const response=await fetch(origin+'/api/auth/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:new URL(origin).origin,'x-real-ip':fixtureIp,Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)})
  for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],equals=pair.indexOf('=');jar.set(pair.slice(0,equals),pair.slice(equals+1))}
  const data=await response.json().catch(()=>null)
  return {data,error:response.ok?null:{message:'Fixture authentication failed'}}
 }
 return {
  async signIn({email,password}){
   const prisma=fixtureDatabase(),identity=await prisma.authIdentity.findUniqueOrThrow({where:{email}})
   const app=await prisma.user.findFirst({where:{authId:identity.id}})
   if(app)await prisma.authIdentity.update({where:{id:identity.id},data:{appUserId:app.id}})
   return request('sign-in/email',{email,password})
  },
  signOut:()=>request('signout',{}),
 }
}
export async function closeFixtureAuth(){if(db){await db.$disconnect();db=undefined}}
