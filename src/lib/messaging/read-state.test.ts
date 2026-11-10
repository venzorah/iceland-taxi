import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { chatAuthorName, markThreadOpen, staffInboxWhere, threadReadState } from './read-state'

describe('thread read state', () => {
  it('stays unread until the thread has been opened, then read', () => {
    assert.equal(threadReadState(2, 3), 'unread')
    assert.equal(threadReadState(0, 3), 'read')
    assert.equal(threadReadState(0, 0), null)
  })

  it('marks only the opened thread read in the list', () => {
    const next = markThreadOpen(
      [
        { ref: 'ITB-1', unread: 2, readState: 'unread' as const },
        { ref: 'ITB-2', unread: 1, readState: 'unread' as const },
      ],
      'ITB-1',
    )
    assert.deepEqual(next[0], { ref: 'ITB-1', unread: 0, readState: 'read' })
    assert.equal(next[1].readState, 'unread')
  })

  it('lists every customer conversation for staff, with no assignee filter', () => {
    const where = staffInboxWhere()
    assert.deepEqual(where, { messages: { some: {} } })
    assert.equal('driverId' in where, false)
    assert.equal(JSON.stringify(where).includes('assigned'), false)
  })

  it('shows Juliet where the stored staff name is Platform Admin', () => {
    assert.equal(chatAuthorName({ authorRole: 'staff', authorName: 'Platform Admin' }), 'Juliet')
    assert.equal(chatAuthorName({ authorRole: 'staff', authorName: 'Juliet' }), 'Juliet')
    assert.equal(chatAuthorName({ authorRole: 'customer', guestName: 'Emma Larsen' }), 'Emma Larsen')
  })
})
