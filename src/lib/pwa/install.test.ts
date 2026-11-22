import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canShowInstallPrompt } from './install'

const ready = {
  standalone: false,
  installed: false,
  visible: false,
  hasDeferredPrompt: true,
  promptUsed: false,
  ios: false,
  desktop: false,
}

describe('install prompt', () => {
  it('stays hidden on a desktop browser', () => {
    assert.equal(canShowInstallPrompt({ ...ready, desktop: true }), false)
  })

  it('still offers install on a phone when the browser has a prompt', () => {
    assert.equal(canShowInstallPrompt(ready), true)
  })

  it('still explains Add to Home Screen on an iPhone', () => {
    assert.equal(canShowInstallPrompt({ ...ready, hasDeferredPrompt: false, ios: true }), true)
  })
})
