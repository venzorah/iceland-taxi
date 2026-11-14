import test from 'node:test'
import assert from 'node:assert/strict'
import { nextDriverStatus, driverActionLabel, toDriverJob } from './service'
test('driver flow advances one step and terminal/payment states cannot advance', () => {
  assert.equal(nextDriverStatus('DRIVER_ASSIGNED'), 'ACKNOWLEDGED')
  assert.equal(nextDriverStatus('ACKNOWLEDGED'), 'DRIVER_EN_ROUTE')
  assert.equal(nextDriverStatus('DRIVER_EN_ROUTE'), 'IN_PROGRESS')
  assert.equal(nextDriverStatus('IN_PROGRESS'), 'COMPLETED')
  for (const state of ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED', 'COMPLETED'] as const) {
    assert.equal(nextDriverStatus(state), null); assert.equal(driverActionLabel(state), null)
  }
})
test('driver job uses saved pickup address, real details and Iceland time', () => {
  const job = toDriverJob({ ref: 'TEST', guestName: null, guestPhone: null, guestEmail: null, serviceLabel: 'Transfer', routeLabel: 'Airport → Reykjavik', pickupAt: new Date('2026-12-01T23:30:00Z'), passengers: 2, luggage: 3, flightNumber: null, pickupAddress: 'Saved address', vehicleLabel: null, notes: 'Passenger note', status: 'DRIVER_ASSIGNED', extras: {}, vehicle: { name: 'Assigned car', plate: 'ABC' } })
  assert.equal(job.time, '23:30'); assert.match(job.dateLabel, /1 Dec 2026/)
  assert.equal(job.pickupAddress, 'Saved address'); assert.match(job.mapUrl, /Saved%20address/)
  assert.equal(job.vehicle, 'Assigned car'); assert.equal(job.customer, 'Guest')
})
