import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { describeWhatsAppFeature, planStaffWhatsApp, staffMessageNotice } from './whatsapp'

const PRIVATE = 'Our flight is now landing 20 minutes early, is that okay?'

describe('staff WhatsApp delivery', () => {
  it('stays off when the company number is unset, even if API credentials exist', () => {
    const plan = planStaffWhatsApp({
      bookingRef: 'ITB-7K4Q2M',
      companyE164: null,
      cloudConfigured: true,
    })
    assert.equal(plan.enabled, false)
    assert.equal(plan.delivery, 'off')
    assert.equal(plan.whatsappUrl, null)
    assert.equal(plan.notice, null)
    const described = describeWhatsAppFeature({ companyE164: '  ', cloudConfigured: false })
    assert.equal(described.mode, 'off')
    assert.match(described.note, /System settings/)
  })

  it('builds a deep link with the booking reference and leaves the private message out', () => {
    const plan = planStaffWhatsApp({
      bookingRef: 'ITB-7K4Q2M',
      companyE164: '+354 555 0100',
      cloudConfigured: false,
    })
    assert.equal(plan.enabled, true)
    assert.equal(plan.delivery, 'link')
    assert.equal(plan.notice, staffMessageNotice('ITB-7K4Q2M'))
    assert.equal(plan.notice?.includes(PRIVATE), false)
    assert.match(plan.whatsappUrl || '', /^https:\/\/wa\.me\/3545550100\?text=/)
    assert.match(decodeURIComponent(plan.whatsappUrl || ''), /New message on booking ITB-7K4Q2M/)
    assert.equal(decodeURIComponent(plan.whatsappUrl || '').includes(PRIVATE), false)
    const described = describeWhatsAppFeature({ companyE164: '+3545550100', cloudConfigured: false })
    assert.equal(described.mode, 'link')
    assert.match(described.note, /not synced/)
  })

  it('uses the Cloud API only when credentials exist, still without the private message', () => {
    const plan = planStaffWhatsApp({
      bookingRef: 'ITB-7K4Q2M',
      companyE164: '+3545550100',
      cloudConfigured: true,
      notifyE164: '+3545550199',
    })
    assert.equal(plan.delivery, 'api')
    assert.equal(plan.recipient, '+3545550199')
    assert.equal(plan.notice?.includes(PRIVATE), false)
    const described = describeWhatsAppFeature({ companyE164: '+3545550100', cloudConfigured: true })
    assert.equal(described.mode, 'cloud')
    assert.match(described.note, /not synced/)
  })
})
