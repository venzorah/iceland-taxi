import assert from 'node:assert/strict'
import test from 'node:test'
import { ownsBooking, cancellationDecision } from './ownership'
const user = { id: 'owner', email: 'owner@example.test', role: 'CUSTOMER' }
test('linked ownership survives email changes and cannot be claimed using a matching email', () => {
  assert.equal(ownsBooking(user, { customerId: 'owner', guestEmail: 'old@example.test' }), true)
  assert.equal(ownsBooking(user, { customerId: 'someone-else', guestEmail: user.email }), false)
  assert.equal(ownsBooking(null, { customerId: 'owner', guestEmail: user.email }), false)
  assert.equal(ownsBooking({ ...user, role: 'DRIVER' }, { customerId: 'owner', guestEmail: user.email }), false)
})
test('only unlinked guest bookings can be matched by the verified account email', () => {
  assert.equal(ownsBooking(user, { customerId: null, guestEmail: 'OWNER@example.test' }), true)
  assert.equal(ownsBooking(user, { customerId: null, guestEmail: 'another@example.test' }), false)
})
test('unpaid cancellation, paid review and started-trip locks follow the agreed policy', () => {
  const now = new Date('2026-11-13T10:00:00Z'), future = new Date('2026-11-14T10:00:00Z')
  assert.deepEqual(cancellationDecision('AWAITING_PAYMENT', false, future, now), { allowed: true, status: 'CANCELLED' })
  assert.deepEqual(cancellationDecision('CONFIRMED', true, future, now), { allowed: true, status: 'REFUND_REQUESTED' })
  for (const status of ['IN_PROGRESS', 'COMPLETED', 'DRIVER_EN_ROUTE', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED']) assert.equal(cancellationDecision(status, true, future, now).allowed, false)
  assert.equal(cancellationDecision('CONFIRMED', false, now, now).allowed, false)
})

test('rescheduling a saved return trip preserves its occupied duration', async () => {
  const { existingPickupDuration, schedulePickupChange } = await import('../booking/pickup')
  const duration = existingPickupDuration({ pickupAt: new Date('2026-12-01T10:00:00Z'), endsAt: new Date('2026-12-01T12:00:00Z'), durationMinutes: 120, extras: { returnTrip: true } })
  const changed = schedulePickupChange({ status: 'CONFIRMED', durationMinutes: duration, returnTrip: false, date: '2026-12-02', time: '10:00' })
  assert.equal(changed.ok, true)
  if (changed.ok) assert.equal(changed.data.endsAt.getTime() - changed.data.pickupAt.getTime(), 120 * 60000)
})
