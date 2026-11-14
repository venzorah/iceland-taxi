import assert from 'node:assert/strict'
import test from 'node:test'
import { alertsEnabled, disablePhoneAlerts, markAlertsEnabled, playMessageSound } from './client'

test('disabled alerts do not play sound, and disabling removes the server and browser subscriptions', async () => {
  const values = new Map<string, string>()
  const local = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value) }
  const originals = Object.fromEntries(['window', 'localStorage', 'sessionStorage', 'navigator', 'fetch', 'Audio'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  const calls: string[] = []
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: () => true } })
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local })
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: local })
    Object.defineProperty(globalThis, 'Audio', { configurable: true, value: class { constructor() { throw new Error('Sound must stay off') } } })
    values.set('itb-alerts-armed', '1')
    playMessageSound()
    markAlertsEnabled(true)
    assert.equal(alertsEnabled(), true)
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serviceWorker: { getRegistration: async () => ({ pushManager: { getSubscription: async () => ({ endpoint: 'https://push.example.test/subscription', unsubscribe: async () => { calls.push('unsubscribe'); return true } }) } }) } } })
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async (_url: string, options: RequestInit) => { assert.equal(options.method, 'DELETE'); calls.push('delete'); return { ok: true } } })
    await disablePhoneAlerts()
    assert.deepEqual(calls, ['delete', 'unsubscribe'])
    assert.equal(alertsEnabled(), false)
    playMessageSound()
  } finally {
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
