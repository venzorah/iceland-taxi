import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { startPolling } from './scheduler'
import { createSingleFlight } from './single-flight'

test('polling waits for completion, backs off failures, and cancels on cleanup', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let calls = 0
  let fail = false
  let complete!: () => void
  let signal!: AbortSignal
  const poller = startPolling(async current => {
    calls++; signal = current
    if (fail) throw new Error('Unavailable')
    await new Promise<void>(resolve => { complete = resolve })
  }, { intervalMs: 100, timeoutMs: 10000 })
  assert.equal(calls, 1)
  t.mock.timers.tick(500)
  assert.equal(calls, 1)
  complete(); await setImmediate()
  fail = true
  t.mock.timers.tick(100); await setImmediate()
  assert.equal(calls, 2)
  t.mock.timers.tick(199); await setImmediate()
  assert.equal(calls, 2)
  t.mock.timers.tick(1); await setImmediate()
  assert.equal(calls, 3)
  poller.stop()
  assert.equal(signal.aborted, true)
  t.mock.timers.tick(10000); await setImmediate()
  assert.equal(calls, 3)
})
test('unauthorized response stops polling and inactive pages skip work', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let calls = 0
  let visible = false
  const poller = startPolling(async () => { calls++; return { stop: true } }, { intervalMs: 100, active: () => visible })
  assert.equal(calls, 0)
  visible = true; poller.refresh(); await setImmediate()
  assert.equal(calls, 1)
  t.mock.timers.tick(1000); await setImmediate()
  assert.equal(calls, 1)
  poller.stop()
})
test('concurrent account lookups share work, but next request rechecks permissions', async () => {
  const lookup = createSingleFlight<number>()
  let calls = 0
  const work = async () => ++calls
  assert.deepEqual(await Promise.all([lookup('user-a', work), lookup('user-a', work)]), [1, 1])
  assert.equal(await lookup('user-a', work), 2)
  await assert.rejects(lookup('user-b', async () => { throw new Error('DB down') }))
  assert.equal(await lookup('user-b', work), 3)
})
