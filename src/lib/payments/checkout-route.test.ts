import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { z } from 'zod'
import { createHash, randomUUID } from 'node:crypto'
import { traceCheckout, timed } from './timing'
function handler(result: 'success'|'rejected'|'timeout' = 'success', allowed = true) {
  const payments: Record<string, unknown>[] = []
  let providerCalls=0
  const booking={id:'fixture-booking',ref:'FIXTURE-REF',listingId:'fixture-listing',adminPriceIsk:10000,vehicleId:'fixture-car',vehicle:{name:'Car',upgradeIsk:0},customer:{email:'private@example.test'},amountSnapshot:10000,amountIskSnapshot:10000,currency:'ISK',status:'AWAITING_PAYMENT',pickupAt:new Date(Date.now()+86400000),routeLabel:'Fixture route',serviceLabel:'Fixture',payments,guestName:'Private Customer'}
  const prisma={booking:{findUnique:async({select}:{select?:unknown})=> select?{status:booking.status}:{...booking,payments:[...payments]}},payment:{
    updateMany:async()=>({count:0}),
    findUnique:async({where}:{where:{id:string}})=>payments.find(p=>p.id===where.id),
    create:async({data}:{data:Record<string,unknown>})=>{if(payments.length)throw Object.assign(Error(),{code:'P2002'});const p={id:'fixture-payment',createdAt:new Date(),updatedAt:new Date(),...data};payments.push(p);return p},
    update:async({data}:{data:Record<string,unknown>})=>Object.assign(payments[0],data),
  }}
  const jsonError=(status:number,code:string,message:string,extra={})=>Response.json({ok:false,code,message,...extra},{status})
  const imports:Record<string,unknown>={
    '@/lib/payments/timing':{traceCheckout,timed}, '@/lib/app-url':{configuredAppUrl:()=> 'https://merchant.example'},'@/lib/env':{teyaCredentials:()=>({environment:'sandbox'})},
    '@/lib/payments/teya':{paymentEnvironmentMatches:()=>true},'node:crypto':{createHash,randomUUID},zod:{z},
    '@/lib/api':{prisma,jsonError,jsonOk:Response.json,apiHandler:(fn:unknown)=>fn},
    '@/lib/payments':{getPaymentProvider:()=>({id:'teya',isConfigured:()=>true,createCheckout:async()=>{providerCalls++;await new Promise(r=>setTimeout(r,10));return result==='success'?{ok:true,provider:'teya',providerRef:'fixture-provider',checkoutUrl:'https://checkout.example/fixture'}:{ok:false,code:'PROVIDER_ERROR',message:result==='timeout'?'Safe timeout':'Safe rejection'}}})},
    '@/lib/booking/service':{createBooking:()=>{throw Error('Existing-booking fixture must not create another booking')}},
    '@/lib/auth/session':{getCurrentUser:async()=>({id:'fixture-customer',role:'CUSTOMER'})},
    '@/lib/customer/booking-access':{canAccessBooking:async()=>allowed,grantGuestBookingAccess:async()=>{}},
    '@/lib/customer/ownership':{ownsBooking:()=>true},'@/lib/payments/sync-teya':{syncTeyaPayment:async()=>{}},
  }
  const source=ts.transpileModule(readFileSync('src/app/api/payments/checkout/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const exports:Record<string,unknown>={}
  vm.runInNewContext(source,{exports,require:(name:string)=>{if(!(name in imports))throw Error('Unexpected dependency');return imports[name]},Response,Request,URL,Date,process:{env:{}}})
  const post=exports.POST as (req:Request)=>Promise<Response>
  return {payments,get calls(){return providerCalls},request:()=>post(new Request('https://merchant.example/api/payments/checkout',{method:'POST',body:JSON.stringify({bookingRef:booking.ref})}))}
}
test('actual checkout handler preserves lease exclusion for concurrent clicks and reuses the saved session',async()=>{
 const h=handler();const responses=await Promise.all([h.request(),h.request()]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(h.calls,1);assert.equal(h.payments.length,1)
 const response=await h.request();assert.equal(response.status,200);assert.equal(h.calls,1);assert(response.headers.get('X-Checkout-Diagnostic-ID'));assert(response.headers.get('Server-Timing'))
})
test('rejected and timed-out checkout stay unpaid, record safe failure, and never automatically retry',async()=>{
 for(const outcome of ['rejected','timeout'] as const){const h=handler(outcome);const response=await h.request();assert.equal(response.status,502);const body=await response.json();assert.equal(body.paid,false);assert.equal(h.calls,1);assert.equal(h.payments[0].status,'PENDING');assert(h.payments[0].failureReason)}
})
test('unauthorized checkout stops before payment writes/provider requests',async()=>{
 const h=handler('success',false);assert.equal((await h.request()).status,404);assert.equal(h.calls,0);assert.equal(h.payments.length,0)
})
