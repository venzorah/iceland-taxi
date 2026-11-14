import test from 'node:test'
import assert from 'node:assert/strict'
import { imageMatchesType, uploadImage, MAX_IMAGE_BYTES } from './cloudinary'
test('uploaded images must have an allowed format matching the bytes',()=>{
  const png=Uint8Array.from([137,80,78,71,13,10,26,10,0])
  assert.equal(imageMatchesType(png,'image/png'),true)
  assert.equal(imageMatchesType(png,'image/jpeg'),false)
  assert.equal(imageMatchesType(new TextEncoder().encode('<svg></svg>'),'image/svg+xml'),false)
  assert.equal(imageMatchesType(new TextEncoder().encode('<html>bad'),'image/png'),false)
})
test('upload without credentials never calls a provider or fabricates a URL',async()=>{
  const old={name:process.env.CLOUDINARY_CLOUD_NAME,key:process.env.CLOUDINARY_API_KEY,secret:process.env.CLOUDINARY_API_SECRET},fetchBefore=globalThis.fetch
  delete process.env.CLOUDINARY_CLOUD_NAME; delete process.env.CLOUDINARY_API_KEY;delete process.env.CLOUDINARY_API_SECRET
  let called=false;globalThis.fetch=async()=>{called=true;throw new Error('Unexpected network')}
  try{const result=await uploadImage(new File(['bad'],'bad.png',{type:'image/png'}));assert.equal(result.ok,false);assert.equal(result.status,503);assert.equal(called,false)}
  finally{globalThis.fetch=fetchBefore;for(const [key,value] of Object.entries({CLOUDINARY_CLOUD_NAME:old.name,CLOUDINARY_API_KEY:old.key,CLOUDINARY_API_SECRET:old.secret})){if(value===undefined)delete process.env[key];else process.env[key]=value}}
  assert.equal(MAX_IMAGE_BYTES,5242880)
})
test('signed uploads accept only a confirmed image response and keep the secret server side', async()=>{
  const previous={CLOUDINARY_CLOUD_NAME:process.env.CLOUDINARY_CLOUD_NAME,CLOUDINARY_API_KEY:process.env.CLOUDINARY_API_KEY,CLOUDINARY_API_SECRET:process.env.CLOUDINARY_API_SECRET},originalFetch=globalThis.fetch
  Object.assign(process.env,{CLOUDINARY_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'test-key',CLOUDINARY_API_SECRET:'private-test-secret'})
  let invalid=false
  globalThis.fetch=async(input,init)=>{
    assert.equal(String(input),'https://api.cloudinary.com/v1_1/test-cloud/image/upload')
    const form=init?.body as FormData
    assert.match(String(form.get('signature')),/^[a-f0-9]{64}$/)
    assert.equal([...form.values()].some(v=>typeof v==='string'&&v.includes('private-test-secret')),false)
    return Response.json({secure_url:invalid?'https://unexpected.example/image.png':'https://res.cloudinary.com/test-cloud/image/upload/test.png',resource_type:'image',public_id:form.get('public_id')})
  }
  try{
    const file=new File([Uint8Array.from([137,80,78,71,13,10,26,10,0])],'test.png',{type:'image/png'})
    const success=await uploadImage(file);assert.equal(success.ok,true)
    invalid=true;const failure=await uploadImage(file);assert.equal(failure.ok,false)
    const html=await uploadImage(new File(['<html>'],'fake.png',{type:'image/png'}));assert.equal(html.ok,false)
  }finally{globalThis.fetch=originalFetch;for(const [key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value}}
})
