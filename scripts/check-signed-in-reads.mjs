import nextEnv from '@next/env'
import {PrismaClient} from '@prisma/client'
import {randomUUID,randomBytes} from 'node:crypto'
import {createFixtureIdentity,deleteFixtureIdentity,fixtureSession,closeFixtureAuth} from './fixture-auth.mjs'
nextEnv.loadEnvConfig(process.cwd())
const origin=process.argv[2]||'http://127.0.0.1:3101',rounds=Math.min(20,Math.max(1,Number(process.argv[3])||3))
const email=`read-check-${randomUUID()}@example.invalid`,password=randomBytes(32).toString('base64url'),jar=new Map()
const fixture=await createFixtureIdentity({email,password}),db=new PrismaClient({datasourceUrl:process.env.DIRECT_URL,log:[]})
try{
 await db.user.create({data:{email,authId:fixture.data.user.id,role:'SUPER_ADMIN',staffProfile:{create:{active:true}}}})
 const client=fixtureSession(origin,jar)
 if((await client.signIn({email,password})).error)throw new Error('Temporary sign-in failed')
 const cookie=[...jar].map(([key,value])=>`${key}=${value}`).join('; ')
 for(let round=1;round<=rounds;round++){
  const results=await Promise.all(['/api/auth/session','/api/messages/alerts?as=staff','/api/listings'].map(async path=>{
   const start=performance.now(),response=await fetch(origin+path,{headers:{Cookie:cookie},signal:AbortSignal.timeout(45000)})
   const body=await response.json()
   if(path==='/api/auth/session'&&response.ok&&body.user?.role!=='SUPER_ADMIN')throw new Error('Unexpected permissions')
   return{path,status:response.status,milliseconds:Math.round(performance.now()-start)}
  }))
  console.log(JSON.stringify({round,results}));if(results.some(result=>result.status!==200))process.exitCode=1
 }
}finally{await db.user.deleteMany({where:{email}});await deleteFixtureIdentity(fixture.data.user.id);await closeFixtureAuth();await db.$disconnect()}
