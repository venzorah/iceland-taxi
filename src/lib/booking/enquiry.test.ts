import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { OFFICIAL_WHATSAPP_E164 } from '../whatsapp'
import { enquiryFollowUp, followUpTargetsCustomer } from './enquiry'

describe('custom enquiry follow-up', () => {
  it('emails the customer', () => {
    const follow = enquiryFollowUp({
      channel: 'EMAIL',
      email: 'emma@example.com',
      phone: '+45 20 12 34 56',
      name: 'Emma Larsen',
      fromLabel: 'Vík',
      toLabel: 'Akureyri',
    })
    assert.equal(follow.channel, 'EMAIL')
    assert.equal(follow.label, 'Email')
    assert.match(follow.href || '', /^mailto:emma@example.com\?/)
    assert.equal((follow.href || '').includes('3548353111'), false)
  })

  it('opens WhatsApp to the customer number, not the company number', () => {
    assert.equal(OFFICIAL_WHATSAPP_E164, '+3548353111')
    const follow = enquiryFollowUp({
      channel: 'WHATSAPP',
      email: 'emma@example.com',
      phone: '+45 20 12 34 56',
      name: 'Emma Larsen',
      fromLabel: 'Vík',
      toLabel: 'Akureyri',
    })
    assert.equal(follow.label, 'WhatsApp')
    assert.match(follow.href || '', /^https:\/\/wa\.me\/4520123456\?text=/)
    assert.equal(followUpTargetsCustomer(follow.href, '+45 20 12 34 56'), true)
    assert.equal((follow.href || '').includes('3548353111'), false)
  })
})
