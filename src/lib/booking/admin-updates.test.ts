import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '@/lib/prisma'
import { updateBookingStatus } from './service'

test('staff booking updates reject stale, closed, unverified-refund and unavailable assignments without writing', async()=>{
  const original=prisma.$transaction
  let booking={id:'booking',ref:'TEST',status:'CONFIRMED',driverId:null as string|null,vehicleId:null as string|null,pickupAt:new Date('2027-01-01T12:00:00Z'),endsAt:new Date('2027-01-01T13:00:00Z'),passengers:3,luggage:2,payments:[]}
  let active=true, capacity=4, overlaps=false
  const fake={
    booking:{findUnique:async()=>booking,findMany:async()=>overlaps?[{id:'other',ref:'OTHER',driverId:'new-driver',vehicleId:null,pickupAt:booking.pickupAt,endsAt:booking.endsAt,durationMinutes:60}]:[],update:async()=>{throw new Error('A rejected operation wrote a booking')}},
    driver:{findFirst:async()=>active?{id:'new-driver',active:true,status:'Available'}:null},
    vehicle:{findFirst:async()=>({active:true,pax:capacity,bags:capacity})},
  }
  prisma.$transaction=(async(callback:unknown)=>{if(typeof callback!=='function')throw new Error('Expected transaction callback');return callback(fake)}) as typeof prisma.$transaction
  try{
    const stale=await updateBookingStatus('TEST',{expectedStatus:'AWAITING_PAYMENT',notes:'Stale edit'});assert.equal(stale.ok,false);if(!stale.ok)assert.equal(stale.code,'BOOKING_CHANGED')
    const refund=await updateBookingStatus('TEST',{status:'REFUNDED'});assert.equal(refund.ok,false);if(!refund.ok)assert.equal(refund.code,'REFUND_NOT_VERIFIED')
    booking={...booking,status:'CANCELLED'}
    assert.equal((await updateBookingStatus('TEST',{driverId:'new-driver'})).ok,false)
    booking={...booking,status:'CONFIRMED'};active=false
    assert.equal((await updateBookingStatus('TEST',{driverId:'new-driver'})).ok,false)
    active=true;capacity=1
    assert.equal((await updateBookingStatus('TEST',{vehicleId:'small-car'})).ok,false)
    capacity=4;overlaps=true
    const conflict=await updateBookingStatus('TEST',{driverId:'new-driver'});assert.equal(conflict.ok,false);if(!conflict.ok)assert.equal(conflict.code,'NOT_AVAILABLE')
  }finally{prisma.$transaction=original}
})
