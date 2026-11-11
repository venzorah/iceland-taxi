import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dueReminderKinds, reminderLabel, ruleFromMinutes, toOffsetMinutes } from './schedule'

const pickup = new Date('2026-12-01T15:00:00.000Z')
const created = new Date('2026-11-01T10:00:00.000Z')
const rules = [7 * 24 * 60, 3 * 24 * 60, 5 * 60].map(ruleFromMinutes)

describe('trip reminder schedule', () => {
  it('sends the week reminder when the trip is 7 days away', () => {
    const now = new Date(pickup.getTime() - toOffsetMinutes(1, 'weeks') * 60 * 1000 + 60 * 60 * 1000)
    assert.deepEqual(dueReminderKinds(pickup, created, now, rules), ['reminder.10080m'])
  })

  it('sends the 3 day reminder inside its window', () => {
    const now = new Date(pickup.getTime() - toOffsetMinutes(3, 'days') * 60 * 1000 + 2 * 60 * 60 * 1000)
    assert.deepEqual(dueReminderKinds(pickup, created, now, rules), ['reminder.4320m'])
  })

  it('sends the 5 hour reminder inside its window', () => {
    const now = new Date(pickup.getTime() - toOffsetMinutes(5, 'hours') * 60 * 1000 + 30 * 60 * 1000)
    assert.deepEqual(dueReminderKinds(pickup, created, now, rules), ['reminder.300m'])
  })

  it('uses an admin-edited timer', () => {
    const custom = [ruleFromMinutes(toOffsetMinutes(2, 'hours'))]
    const now = new Date(pickup.getTime() - 2 * 60 * 60 * 1000 + 20 * 60 * 1000)
    assert.deepEqual(dueReminderKinds(pickup, created, now, custom), ['reminder.120m'])
    assert.equal(reminderLabel('reminder.120m'), '2 hours')
  })

  it('does not send a reminder for a booking made after that reminder was due', () => {
    const late = new Date(pickup.getTime() - 2 * 24 * 60 * 60 * 1000)
    const now = new Date(pickup.getTime() - toOffsetMinutes(3, 'days') * 60 * 1000 + 60 * 60 * 1000)
    assert.deepEqual(dueReminderKinds(pickup, late, now, rules), [])
  })

  it('does not send after the trip has started', () => {
    const now = new Date(pickup.getTime() + 60 * 1000)
    assert.deepEqual(dueReminderKinds(pickup, created, now, rules), [])
  })
})
