import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  authorizePickupEdit,
  canEditPickup,
  customerPickupView,
  formatPickupConfirmation,
  pickupInstant,
  pickupParts,
  schedulePickupChange,
} from './pickup'

const priced = {
  listingId: 'route-kef',
  listingKind: 'route',
  adminPriceIsk: 22900,
  amountSnapshot: 166,
  amountIskSnapshot: 22900,
  priceLines: [{ label: 'Keflavík Airport (KEF) → Reykjavík city centre', isk: 22900 }],
}

describe('customer pickup time', () => {
  it('reads and writes the Iceland date and time', () => {
    const pickup = pickupInstant('2026-11-12', '16:45')
    assert.ok(pickup)
    assert.equal(pickup.toISOString(), '2026-11-12T16:45:00.000Z')
    assert.deepEqual(pickupParts(pickup), { date: '2026-11-12', time: '16:45' })
    assert.match(formatPickupConfirmation(pickup), /12 Nov 2026/)
    assert.match(formatPickupConfirmation(pickup), /16:45/)
  })

  it('rejects an impossible calendar day', () => {
    assert.equal(pickupInstant('2026-02-31', '10:00'), null)
    assert.equal(pickupInstant('12/11/2026', '16:45'), null)
    assert.equal(pickupInstant('2026-11-12', '4:45'), null)
  })

  it('schedules a new pickup without copying the listing or the admin price', () => {
    const result = schedulePickupChange({
      ...priced,
      status: 'DRIVER_ASSIGNED',
      durationMinutes: 45,
      returnTrip: false,
      date: '2026-12-01',
      time: '09:15',
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(Object.keys(result.data).sort(), ['endsAt', 'pickupAt'])
    assert.equal(result.data.pickupAt.toISOString(), '2026-12-01T09:15:00.000Z')
    assert.equal(result.data.endsAt.toISOString(), '2026-12-01T10:00:00.000Z')
    assert.equal('listingId' in result.data, false)
    assert.equal('adminPriceIsk' in result.data, false)
    assert.equal('amountSnapshot' in result.data, false)
    assert.equal('priceLines' in result.data, false)
    assert.equal(priced.listingId, 'route-kef')
    assert.equal(priced.adminPriceIsk, 22900)
  })

  it('keeps the same window length, including a return trip', () => {
    const result = schedulePickupChange({
      status: 'CONFIRMED',
      durationMinutes: 50,
      returnTrip: true,
      date: '2026-11-20',
      time: '08:00',
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.data.endsAt.getTime() - result.data.pickupAt.getTime(), 100 * 60_000)
  })

  it('blocks completed and cancelled trips', () => {
    for (const status of ['COMPLETED', 'CANCELLED'] as const) {
      assert.equal(canEditPickup(status), false)
      const result = schedulePickupChange({ status, date: '2026-11-12', time: '16:45' })
      assert.equal(result.ok, false)
      if (result.ok) return
      assert.equal(result.code, 'PICKUP_LOCKED')
      assert.equal('data' in result, false)
    }
    assert.equal(canEditPickup('DRIVER_ASSIGNED'), true)
    assert.equal(canEditPickup('AWAITING_PAYMENT'), true)
  })

  it('allows only the signed-in customer on the booking', () => {
    const booking = { guestEmail: 'Emma@Example.Local' }
    assert.equal(authorizePickupEdit(booking, null).ok, false)
    assert.equal(authorizePickupEdit(booking, 'jon@example.local').ok, false)
    assert.equal(authorizePickupEdit(booking, 'emma@example.local').ok, true)
  })

  it('shows the saved pickup on the customer trip', () => {
    const view = customerPickupView({
      ref: 'ITB-7K4Q2M',
      serviceLabel: 'Airport transfer',
      routeLabel: 'KEF → Hotel Borg',
      status: 'DRIVER_ASSIGNED',
      pickupAt: new Date('2026-11-12T16:45:00.000Z'),
      passengers: 2,
    })
    assert.equal(view.pickupDate, '2026-11-12')
    assert.equal(view.pickupTime, '16:45')
    assert.equal(view.canEditPickup, true)
    assert.match(view.pickupLabel, /16:45/)
  })
})
