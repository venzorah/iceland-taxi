import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FIVE_HOURS_MS, THREE_DAYS_MS, WEEK_MS, dueReminderKinds } from './schedule'

const pickup = new Date('2026-12-01T15:00:00.000Z')
const created = new Date('2026-11-01T10:00:00.000Z')

describe('trip reminder schedule', () => {
  it('sends the week reminder when the trip is 7 days away', () => {
    const now = new Date(pickup.getTime() - WEEK_MS + 60 * 60 * 1000)
    assert.deepEqual(dueReminderKinds(pickup, created, now), ['reminder.7d'])
  })

  it('sends the 3 day reminder inside its window', () => {
    const now = new Date(pickup.getTime() - THREE_DAYS_MS + 2 * 60 * 60 * 1000)
    assert.deepEqual(dueReminderKinds(pickup, created, now), ['reminder.3d'])
  })

  it('sends the 5 hour reminder inside its window', () => {
    const now = new Date(pickup.getTime() - FIVE_HOURS_MS + 30 * 60 * 1000)
    assert.deepEqual(dueReminderKinds(pickup, created, now), ['reminder.5h'])
  })

  it('does not send a reminder for a booking made after that reminder was due', () => {
    const late = new Date(pickup.getTime() - 2 * 24 * 60 * 60 * 1000)
    const now = new Date(pickup.getTime() - THREE_DAYS_MS + 60 * 60 * 1000)
    assert.deepEqual(dueReminderKinds(pickup, late, now), [])
  })

  it('does not send after the trip has started', () => {
    const now = new Date(pickup.getTime() + 60 * 1000)
    assert.deepEqual(dueReminderKinds(pickup, created, now), [])
  })
})
