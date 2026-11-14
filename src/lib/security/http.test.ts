import assert from 'node:assert/strict'
import test from 'node:test'
import {boundedRequest,HttpError,validateRequestOrigin} from './http'
import {requestIdentity} from './rate-limit'

test('browser mutations reject foreign origins while signed non-browser webhooks retain raw bytes',async()=>{
 const previous=process.env.NEXT_PUBLIC_APP_URL
 process.env.NEXT_PUBLIC_APP_URL='https://taxi.example'
 try{
  assert.throws(()=>validateRequestOrigin(new Request('https://internal/api',{method:'POST',headers:{origin:'https://evil.example'}})),(e:unknown)=>e instanceof HttpError&&e.status===403)
  validateRequestOrigin(new Request('https://internal/api',{method:'PATCH',headers:{origin:'https://taxi.example'}}))
  const request=new Request('https://internal/api',{method:'POST',body:' { "signed": true }\n'})
  validateRequestOrigin(request)
  assert.equal(await (await boundedRequest(request)).text(),' { "signed": true }\n')
 }finally{if(previous===undefined)delete process.env.NEXT_PUBLIC_APP_URL;else process.env.NEXT_PUBLIC_APP_URL=previous}
})
test('streamed body limit rejects oversized input without trusting Content-Length',async()=>{
 await assert.rejects(()=>boundedRequest(new Request('https://taxi.example/api',{method:'POST',body:'x'.repeat(101),headers:{'Content-Length':'1'}}),100),(e:unknown)=>e instanceof HttpError&&e.status===413)
})
test('untrusted forwarding headers cannot bypass the shared public request budget',()=>{
 const previous=process.env.RATE_LIMIT_PROXY_HEADER
 delete process.env.RATE_LIMIT_PROXY_HEADER
 try{assert.equal(requestIdentity(new Request('https://taxi.example',{headers:{'x-forwarded-for':'8.8.8.8','x-real-ip':'8.8.8.8'}})),'shared-public-budget')
 process.env.RATE_LIMIT_PROXY_HEADER='x-real-ip'
 assert.equal(requestIdentity(new Request('https://taxi.example',{headers:{'x-real-ip':'8.8.8.8'}})),'8.8.8.8')
 assert.equal(requestIdentity(new Request('https://taxi.example',{headers:{'x-real-ip':'malformed'}})),'shared-public-budget')
 }finally{if(previous===undefined)delete process.env.RATE_LIMIT_PROXY_HEADER;else process.env.RATE_LIMIT_PROXY_HEADER=previous}
})
