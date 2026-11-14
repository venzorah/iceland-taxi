import {createHmac} from 'node:crypto'
import {isIP} from 'node:net'
import {prisma} from '@/lib/prisma'
import {HttpError} from './http'
const denied=new Map<string,number>()
/** Configure only when your reverse proxy overwrites the chosen header and prevents direct bypass. */
export function requestIdentity(req:Request){
 const configured=process.env.RATE_LIMIT_PROXY_HEADER
 if(configured==='x-real-ip'||configured==='cf-connecting-ip'){
  const ip=req.headers.get(configured)?.trim()
  if(ip&&isIP(ip))return ip
 }
 return 'shared-public-budget'
}
export async function rateLimit(scope:string,identity:string,limit:number,windowMs:number){
 const secret=process.env.BOOKING_ACCESS_SECRET
 if(!secret||secret.length<32)throw new HttpError(503,'SECURITY_CONFIG_REQUIRED','The service is temporarily unavailable.')
 const key=scope+':'+createHmac('sha256',secret).update('rate-limit:'+identity).digest('hex'),now=new Date()
 const blockedUntil=denied.get(key)
 if(blockedUntil&&blockedUntil>now.getTime())throw new HttpError(429,'RATE_LIMITED','Too many requests. Please try again later.',Math.max(1,Math.ceil((blockedUntil-now.getTime())/1000)))
 const resetAt=new Date(now.getTime()+windowMs)
 const [row]=await prisma.$queryRaw<{hits:number;resetAt:Date}[]>`
 INSERT INTO "RateLimit" ("key","hits","resetAt") VALUES (${key},1,${resetAt})
 ON CONFLICT ("key") DO UPDATE SET
 "hits"=CASE WHEN "RateLimit"."resetAt"<=${now} THEN 1 ELSE "RateLimit"."hits"+1 END,
 "resetAt"=CASE WHEN "RateLimit"."resetAt"<=${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
 RETURNING "hits","resetAt"`
 if(row.hits>limit){if(denied.size>5000)denied.clear();denied.set(key,row.resetAt.getTime());throw new HttpError(429,'RATE_LIMITED','Too many requests. Please try again later.',Math.max(1,Math.ceil((row.resetAt.getTime()-now.getTime())/1000)))}
}
const budgets:Record<string,[number,number]>={
 '/api/contact':[20,600000],'/api/enquiries':[30,600000],'/api/payments/checkout':[60,60000],'/api/bookings':[30,60000],'/api/bookings/lookup':[30,60000],'/api/bookings/quote':[300,60000],'/api/bookings/availability':[120,60000],'/api/maps/geocode':[30,60000],'/api/push/subscribe':[60,60000]
}
export async function publicRequestBudget(req:Request){const budget=budgets[new URL(req.url).pathname];if(req.method!=='GET'&&budget)await rateLimit(new URL(req.url).pathname,requestIdentity(req),...budget)}
