import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildQuote } from './pricing'

describe('vehicle additional cost', () => {
  it('adds the car cost on top of the published price', () => {
    const quote = buildQuote({
      baseIsk: 22900,
      baseLabel: 'KEF → Reykjavík',
      vehicleUpgradeIsk: 8000,
      vehicleLabel: 'SUV',
      customerCategory: 'INTERNATIONAL',
      currency: 'EUR',
      iskPerEur: 150,
    })

    assert.deepEqual(
      quote.lines.map((line) => [line.key, line.isk]),
      [
        ['listing', 22900],
        ['vehicle', 8000],
      ],
    )
    assert.equal(quote.amountIskSnapshot, 30900)
    assert.equal(quote.amountSnapshot, Math.round(30900 / 150))
    assert.equal(quote.lines[1]?.label, 'SUV additional')
  })

  it('keeps the published price when the selected car has no additional cost', () => {
    const quote = buildQuote({
      baseIsk: 22900,
      vehicleUpgradeIsk: 0,
      vehicleLabel: 'Standard Sedan',
      customerCategory: 'RESIDENT',
      currency: 'ISK',
    })

    assert.equal(quote.lines.length, 1)
    assert.equal(quote.amountIskSnapshot, 22900)
  })
})
