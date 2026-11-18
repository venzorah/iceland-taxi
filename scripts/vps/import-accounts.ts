// Source is always read-only. Target application users are never rewritten.
// Default: dry run. --apply --target-database NAME enables a reviewed, atomic target-only import.
import {loadEnvConfig} from '@next/env'
import {PrismaClient} from '@prisma/client'
import {createHash} from 'node:crypto'
import {planIdentityImport,type SourceIdentity} from '../../src/lib/auth/import-plan'
loadEnvConfig(process.cwd())
const apply=process.argv.includes('--apply')
const databaseArgument=process.argv[process.argv.indexOf('--target-database')+1]
const userSelect={id:true,authId:true,email:true,name:true,role:true,createdAt:true,updatedAt:true} as const
async function main(){
 const sourceValue=process.env.MIGRATION_SOURCE_URL,targetValue=process.env.MIGRATION_TARGET_URL
 if(!sourceValue||!targetValue)throw new Error('PRIVATE_MIGRATION_URLS_REQUIRED')
 const sourceURL=new URL(sourceValue),targetURL=new URL(targetValue)
 if(!['postgresql:','postgres:'].includes(sourceURL.protocol)||!['postgresql:','postgres:'].includes(targetURL.protocol))throw new Error('INVALID_CONNECTION_CONFIGURATION')
 const targetName=decodeURIComponent(targetURL.pathname.slice(1))
 if(!['127.0.0.1','localhost','[::1]'].includes(targetURL.hostname)||!['iceland_taxi','iceland_taxi_rehearsal'].includes(targetName))throw new Error('PRIVATE_TARGET_REQUIRED')
 if(sourceURL.hostname===targetURL.hostname&&sourceURL.port===targetURL.port&&sourceURL.pathname===targetURL.pathname)throw new Error('SOURCE_EQUALS_TARGET')
 if(apply&&(!process.argv.includes('--target-database')||databaseArgument!==targetName))throw new Error('EXPLICIT_TARGET_NAME_REQUIRED')
 for(const url of [sourceURL,targetURL])for(const[key,value]of Object.entries({connection_limit:'1',connect_timeout:'10',pool_timeout:'10',socket_timeout:'30'}))url.searchParams.set(key,value)
 const source=new PrismaClient({datasourceUrl:sourceURL.href,log:[]}),target=new PrismaClient({datasourceUrl:targetURL.href,log:[]})
 try{
  const snapshot=await source.$transaction(async tx=>{
   await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
   await tx.$executeRawUnsafe('SET LOCAL row_security = off')
   const business=await tx.user.findMany({select:userSelect})
   const identities=await tx.$queryRaw<SourceIdentity[]>`SELECT u.id::text,u.email,u.email_confirmed_at,u.encrypted_password,u.created_at,u.updated_at,u.banned_until,u.deleted_at,u.is_anonymous,COALESCE(array_agg(DISTINCT i.provider) FILTER (WHERE i.provider IS NOT NULL),ARRAY[]::text[]) AS providers FROM auth.users u LEFT JOIN auth.identities i ON i.user_id=u.id GROUP BY u.id ORDER BY u.id`
   return{business,identities}
  },{isolationLevel:'RepeatableRead',timeout:60000})
  const [destination]=await target.$queryRaw<{name:string;role:string;managed:boolean}[]>`SELECT current_database() AS name,current_user AS role,to_regnamespace('auth') IS NOT NULL AS managed`
  if(destination.name!==targetName||destination.role!=='iceland_owner'||destination.managed)throw new Error('TARGET_IDENTITY_GUARD_FAILED')
  const summary=await target.$transaction(async tx=>{
   if(!apply)await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
   if(await tx.authSession.count())throw new Error('TARGET_HAS_ACTIVE_SESSIONS_STOP_FOR_REVIEW')
   const restored=await tx.user.findMany({select:userSelect})
   const plan=planIdentityImport(snapshot.identities,snapshot.business,restored)
   const expectedIds=new Set(plan.map(row=>row.id))
   const existing=await tx.authIdentity.findMany({include:{accounts:true}})
   if(existing.some(row=>!expectedIds.has(row.id)))throw new Error('TARGET_HAS_UNEXPECTED_IDENTITIES')
   let imported=0,skipped=0
   for(const row of plan){
    const prior=existing.find(identity=>identity.id===row.id)
    if(prior){
     if(prior.appUserId!==row.appUserId||prior.email!==row.email||prior.emailVerified!==row.emailVerified||prior.disabled!==row.disabled||prior.accounts.length!==1||prior.accounts[0].providerId!=='credential'||prior.accounts[0].accountId!==row.id)throw new Error('EXISTING_IDENTITY_MAPPING_MISMATCH')
     skipped++;continue
    }
    if(apply){
     const {password,resetRequired:_reset,...identity}=row
     await tx.authIdentity.create({data:identity})
     // Stable deterministic credential ID makes retry behavior explicit; no sessions/tokens imported.
     await tx.authAccount.create({data:{id:'credential_'+createHash('sha256').update(row.id).digest('hex'),accountId:row.id,providerId:'credential',userId:row.id,password,createdAt:row.createdAt,updatedAt:row.updatedAt}})
    }
    imported++
   }
   return{mode:apply?'applied':'dry-run',total:plan.length,linked:plan.filter(row=>row.appUserId).length,authOnly:plan.filter(row=>!row.appUserId).length,resetRequired:plan.filter(row=>row.resetRequired).length,disabled:plan.filter(row=>row.disabled).length,imported,skipped}
  },{isolationLevel:'Serializable',timeout:60000})
  // Counts only. Never print source records, hashes, URLs, email addresses or token values.
  console.log(JSON.stringify(summary))
 }finally{await source.$disconnect();await target.$disconnect()}
}
void main().catch((error:Error)=>{const safe=/^[A-Z_]+$/.test(error.message)?error.message:'IMPORT_FAILED';console.error('Identity import stopped:',safe);process.exitCode=1})
