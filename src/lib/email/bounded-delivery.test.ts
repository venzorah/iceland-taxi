import assert from 'node:assert/strict'
import test from 'node:test'
import { deliverBounded } from './bounded-delivery'
test('bounded deliveries await all successes/failures, with at most two connections', async () => {
  let active = 0, peak = 0
  const finished: number[] = []
  await assert.rejects(deliverBounded([1,2,3,4], async n => {
    peak = Math.max(peak, ++active)
    await new Promise(r => setTimeout(r, 5)); active--; finished.push(n)
    if (n === 2) throw Error('private smtp credential/customer')
  }), error => error instanceof Error && !error.message.includes('private smtp'))
  assert.equal(peak, 2); assert.deepEqual(finished.sort(), [1,2,3,4]); assert.equal(active, 0)
})
