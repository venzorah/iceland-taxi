// Real Cloudinary test with tiny generated images and temporary Auth/database fixtures only.
import nextEnv from '@next/env'
import {PrismaClient} from '@prisma/client'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
import {randomUUID,randomBytes,createHash} from 'node:crypto'
import assert from 'node:assert/strict'
nextEnv.loadEnvConfig(process.cwd())
const origin=process.argv[2]||'http://127.0.0.1:3107'
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Local server required')
const run=randomUUID(),ids=[],accounts=[],keys=[]
const connection=new URL(process.env.DIRECT_URL||process.env.DATABASE_URL);connection.searchParams.set('connection_limit','1');connection.searchParams.set('connect_timeout','30')
const db=new PrismaClient({datasourceUrl:connection.toString()})
const auth=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
async function account(role){
 const email=`media-${role.toLowerCase()}-${run}@example.invalid`,password=randomBytes(32).toString('base64url')
 const result=await auth.auth.admin.createUser({email,password,email_confirm:true});if(result.error)throw new Error('Temporary identity creation failed')
 const a={identity:result.data.user.id,jar:new Map()};accounts.push(a)
 a.user=await db.user.create({data:{email,role,authId:a.identity,name:'Temporary media verification'}})
 const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[...a.jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>a.jar.set(name,value))}})
 if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Temporary login failed')
 return a
}
async function request(a,path,method='GET',body){
 const headers={Cookie:[...a.jar].map(([k,v])=>`${k}=${v}`).join('; ')}
 if(body&&!(body instanceof FormData))headers['Content-Type']='application/json'
 const response=await fetch(origin+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined})
 return{status:response.status,body:await response.json()}
}
function image(){const form=new FormData();form.set('file',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWLsAAAAASUVORK5CYII=','base64')],`${run}.png`,{type:'image/png'}));form.set('alt','Temporary upload verification');return form}
try{
 const content=await account('CONTENT_MANAGER'),finance=await account('FINANCE_MANAGER')
 assert.equal((await request(finance,'/api/admin/library')).status,403)
 assert.equal((await request(finance,'/api/admin/site-blocks','PUT',{key:'home.hero.title',value:'Forbidden'})).status,403)
 assert.equal((await request(content,'/api/admin/site-blocks','PUT',{key:'unknown.key',value:'Unknown'})).status,400)
 assert.equal((await request(content,'/api/admin/site-blocks','PUT',{key:'image.hero',value:'javascript:alert(1)'})).status,400)
 const list=await request(content,'/api/admin/library');assert.equal(list.status,200);assert.ok(list.body.images.some(i=>i.source==='built-in'))
 const upload=await request(content,'/api/admin/library','POST',image())
 assert.equal(upload.status,201,`Real Cloudinary upload returned ${upload.status}: ${upload.body.code||''}`)
 ids.push(upload.body.image.id)
 assert.match(upload.body.image.url,/^https:\/\/res\.cloudinary\.com\//)
 const stored=await db.mediaAsset.findUniqueOrThrow({where:{id:ids[0]}});assert.equal(stored.name,`${run}.png`);assert.equal(stored.bytes>0,true)
 const delivered=await fetch(stored.url);assert.equal(delivered.status,200);assert.match(delivered.headers.get('content-type'),/^image\//)
 const key=`test-media-${run}`;keys.push(key);await db.siteBlock.create({data:{key,value:stored.url}})
 const replacement=await request(content,`/api/admin/library/${ids[0]}`,'PATCH',image());assert.equal(replacement.status,200);ids.push(replacement.body.image.id)
 assert.notEqual(replacement.body.image.url,stored.url)
 assert.equal((await db.siteBlock.findUniqueOrThrow({where:{key}})).value,replacement.body.image.url)
 assert.equal((await db.mediaAsset.findUniqueOrThrow({where:{id:ids[0]}})).archived,true)
 assert.equal((await request(content,`/api/admin/library/${ids[1]}`,'DELETE')).status,200)
 assert.equal((await request(content,'/api/admin/library')).body.images.some(i=>ids.includes(i.id)),false)
 const redirect=await fetch(origin+`/api/media/${ids[1]}`,{redirect:'manual'});assert.equal(redirect.status,302)
 console.log('Real Cloudinary upload/delivery, PostgreSQL URL metadata, replacement references, archive safety and role controls: PASS')
}catch(error){console.error('Media verification failed:',error.message);process.exitCode=1}
finally{
 await db.siteBlock.deleteMany({where:{key:{in:keys}}})
 const assets=await db.mediaAsset.findMany({where:{id:{in:ids}}})
 for(const asset of assets){
  if(asset.name!==`${run}.png`||!asset.publicId.startsWith('iceland-taxi/'))throw new Error('Fixture cleanup safety check failed')
  const timestamp=String(Math.floor(Date.now()/1000)),public_id=asset.publicId
  const signature=createHash('sha256').update(`public_id=${public_id}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`).digest('hex')
  const form=new FormData();for(const[k,v]of Object.entries({public_id,timestamp,signature,api_key:process.env.CLOUDINARY_API_KEY}))form.set(k,v)
  const removed=await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`,{method:'POST',body:form});const data=await removed.json()
  if(!removed.ok||!['ok','not found'].includes(data.result)){console.error('Own test image cleanup needs a retry');process.exitCode=1}
 }
 await db.mediaAsset.deleteMany({where:{id:{in:ids}}})
 for(const a of accounts){if(a.user)await db.user.delete({where:{id:a.user.id}});if((await auth.auth.admin.deleteUser(a.identity)).error){console.error('Temporary Auth cleanup needs retry');process.exitCode=1}}
 await db.$disconnect();console.log('Temporary media accounts, metadata, references and uploaded test images cleaned up.')
}
