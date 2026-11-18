import {createFixtureIdentity,deleteFixtureIdentity,fixtureSession,closeFixtureAuth} from './fixture-auth.mjs'
// Browser-only acceptance against an isolated local server. Temporary users only.
import nextEnv from '@next/env'
import {PrismaClient} from '@prisma/client'
import {randomUUID,randomBytes} from 'node:crypto'
import {verifyAdminBrowser} from './admin-browser-check.mjs'
nextEnv.loadEnvConfig(process.cwd())
const origin=process.argv[2]||'http://127.0.0.1:3108'
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname)||!process.env.CHROME_DEBUG_URL)throw new Error('Local server and isolated Chrome required')
const url=new URL(process.env.DIRECT_URL||process.env.DATABASE_URL);url.searchParams.set('connection_limit','1');url.searchParams.set('connect_timeout','30');url.searchParams.set('pool_timeout','40')
const db=new PrismaClient({datasourceUrl:url.toString()}),accounts=[],run=randomUUID()
try{
 for(const role of ['SUPER_ADMIN','FINANCE_MANAGER']){
  const email=`admin-browser-${role.toLowerCase()}-${run}@example.invalid`,password=randomBytes(32).toString('base64url')
  const result=await createFixtureIdentity({email,password,email_confirm:true});if(result.error)throw new Error('Temporary identity creation failed')
  const a={identity:result.data.user.id,email,jar:new Map()};accounts.push(a)
  a.user=await db.user.create({data:{email,role,authId:a.identity,name:'Browser verification'}})
  const client=fixtureSession(origin, a.jar)
  if((await client.signIn({email,password})).error)throw new Error('Temporary login failed')
 }
 await verifyAdminBrowser(accounts[0].jar,accounts[1].jar,origin)
}catch(error){console.error('Admin browser verification failed:',error.message);process.exitCode=1}
finally{for(const a of accounts){await db.user.deleteMany({where:{email:a.email}});if((await deleteFixtureIdentity(a.identity)).error){console.error('Temporary Auth cleanup needs retry');process.exitCode=1}}await closeFixtureAuth();await db.$disconnect();console.log('Temporary browser accounts removed.')}
