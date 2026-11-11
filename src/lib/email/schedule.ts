export const WEEK_MS = 7 * 24 * 60 * 60 * 1000
export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
export const FIVE_HOURS_MS = 5 * 60 * 60 * 1000

const REMINDERS = [
  { kind: 'reminder.7d', offsetMs: WEEK_MS, slackMs: 36 * 60 * 60 * 1000 },
  { kind: 'reminder.3d', offsetMs: THREE_DAYS_MS, slackMs: 36 * 60 * 60 * 1000 },
  { kind: 'reminder.5h', offsetMs: FIVE_HOURS_MS, slackMs: 4 * 60 * 60 * 1000 },
] as const

/** Reminder kinds whose send time has arrived and whose window is still open. */
export function dueReminderKinds(pickupAt: Date, createdAt: Date, now: Date) {
  const due: string[] = []
  for (const reminder of REMINDERS) {
    const trigger = pickupAt.getTime() - reminder.offsetMs
    if (createdAt.getTime() > trigger) continue
    if (now.getTime() < trigger) continue
    if (now.getTime() >= trigger + reminder.slackMs) continue
    if (now.getTime() >= pickupAt.getTime()) continue
    due.push(reminder.kind)
  }
  return due
}

export function reminderLabel(kind: string) {
  if (kind === 'reminder.7d') return 'one week'
  if (kind === 'reminder.3d') return '3 days'
  if (kind === 'reminder.5h') return '5 hours'
  return 'soon'
}
