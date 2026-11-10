import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { messageAlertCopy } from './copy'

describe('message alert copy', () => {
  it('names the booking and leaves the message body out', () => {
    const copy = messageAlertCopy('ITB-7K4Q2M', '/messages?ref=ITB-7K4Q2M')
    assert.equal(copy.title, 'Iceland Taxi Booking')
    assert.equal(copy.body, 'New message on ITB-7K4Q2M')
    assert.equal(copy.body.includes('pickup'), false)
    assert.equal(Object.keys(copy).sort().join(','), 'body,title,url')
  })
})
