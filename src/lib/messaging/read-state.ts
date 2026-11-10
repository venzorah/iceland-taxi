/** Roles that handle customer messages. They share one inbox, not a personal assignment list. */
export const MESSAGE_STAFF_ROLES = ['SUPER_ADMIN', 'BOOKING_MANAGER', 'STAFF'] as const

export type ThreadReadState = 'unread' | 'read' | null

/** Unread until the audience opens the thread. Null when the booking has no messages yet. */
export function threadReadState(unread: number, messageCount: number): ThreadReadState {
  if (messageCount <= 0) return null
  return unread > 0 ? 'unread' : 'read'
}

/** Every customer conversation. Not filtered by the driver or staff member assigned to the trip. */
export function staffInboxWhere() {
  return { messages: { some: {} } }
}

export function chatAuthorName(input: {
  authorRole: string
  authorName?: string | null
  guestName?: string | null
}) {
  if (input.authorRole === 'customer') return input.guestName?.trim() || input.authorName?.trim() || 'Customer'
  if (input.authorName === 'Platform Admin') return 'Juliet'
  return input.authorName?.trim() || 'Staff'
}

export function markThreadOpen<T extends { ref: string; unread: number; readState?: ThreadReadState }>(
  threads: T[],
  ref: string | null,
): T[] {
  if (!ref) return threads
  return threads.map((thread) =>
    thread.ref === ref && thread.readState !== null
      ? { ...thread, unread: 0, readState: 'read' as const }
      : thread,
  )
}
