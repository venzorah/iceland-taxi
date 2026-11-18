import { configuredAppUrl } from '@/lib/app-url'
export class HttpError extends Error {
 constructor(public status:number,public code:string,message:string,public retryAfter?:number){super(message)}
}
const writes=new Set(['POST','PUT','PATCH','DELETE'])
/** Webhooks/non-browser clients have no Origin; browser mutations must be same-origin. */
export function validateRequestOrigin(req:Request){
 if(!writes.has(req.method))return
 if(req.headers.get('sec-fetch-site')==='cross-site')throw new HttpError(403,'INVALID_ORIGIN','This request is not allowed.')
 const origin=req.headers.get('origin')
 if(!origin)return
 const expected=configuredAppUrl()
 let allowed:string
 try{const url=new URL(expected||req.url);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Invalid app origin');allowed=url.origin}catch{throw new HttpError(503,'APP_URL_REQUIRED','Application URL configuration is required.')}
 if(origin!==allowed)throw new HttpError(403,'INVALID_ORIGIN','This request is not allowed.')
}
/** JSON bodies are capped while streaming; Content-Length is not trusted. Multipart has its own upload cap. */
export async function boundedRequest(req:Request,maxBytes=65536){
 if(!writes.has(req.method)||req.headers.get('content-type')?.startsWith('multipart/form-data;')||!req.body)return req
 const reader=req.body.getReader();let size=0;const chunks:Uint8Array[]=[]
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new HttpError(413,'REQUEST_TOO_LARGE','The request is too large.')}chunks.push(value)}}finally{reader.releaseLock()}
 return new Request(req.url,{method:req.method,headers:req.headers,body:Buffer.concat(chunks),signal:req.signal})
}
