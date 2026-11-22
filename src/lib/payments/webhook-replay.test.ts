import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { BookingStatus, PaymentStatus } from '@prisma/client'
test('verified webhook replay captures once, does not resurrect refunds and respects environment isolation',async()=>{
 const payment={id:'fixture-payment',bookingId:'fixture-booking',status:'PENDING',raw:{environment:'sandbox'}},booking={status:'AWAITING_PAYMENT'}
 let notifications=0, writes=0, environmentMatches=true
 const prisma={payment:{findFirst:async()=>payment},$transaction:async(fn:(tx:unknown)=>Promise<unknown>)=>fn({
  payment:{updateMany:async()=>{if(['CAPTURED','REFUNDED'].includes(payment.status))return{count:0};payment.status='CAPTURED';writes++;return{count:1}}},
  booking:{updateMany:async({where,data}:{where:{status:{in?:string[]}|string};data:{status:string}})=>{const matched=typeof where.status==='string'?booking.status===where.status:where.status.in?.includes(booking.status);if(matched){booking.status=data.status;return{count:1}}return{count:0}}},
 })}
 const imports:Record<string,unknown>={'@prisma/client':{BookingStatus,PaymentStatus},'@/lib/api':{prisma},'@/lib/design/data':{},'./teya':{paymentEnvironmentMatches:()=>environmentMatches},'@/lib/email/notices':{notifyBookingConfirmed:async()=>{notifications++}}}
 const source=ts.transpileModule(readFileSync('src/lib/payments/sync-teya.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const exports:Record<string,unknown>={};vm.runInNewContext(source,{exports,require:(name:string)=>{if(!(name in imports))throw Error('Unexpected dependency');return imports[name]},Date,console})
 const capture=exports.captureFromVerifiedWebhook as (input:unknown)=>Promise<{applied:boolean;duplicate?:boolean}>
 const input={sessionId:'fixture-session',merchantRef:'FIXTURE',raw:{type:'payment.succeeded.v1'}}
 assert.equal((await capture(input)).applied,true);assert.equal((await capture(input)).duplicate,true);assert.equal(writes,1);assert.equal(notifications,1);assert.equal(booking.status,'CONFIRMED')
 payment.status='REFUNDED';assert.equal((await capture(input)).applied,false);assert.equal(writes,1)
 payment.status='PENDING';environmentMatches=false;assert.equal((await capture(input)).applied,false);assert.equal(writes,1)
})
