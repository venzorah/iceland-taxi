export type ReminderUnit = 'hours' | 'days' | 'weeks'

export type ReminderRule = {
  offsetMs: number
  slackMs: number
  kind: string
}

export const DEFAULT_REMINDER_MINUTES = [7 * 24 * 60, 3 * 24 * 60, 5 * 60]

const HOUR_MS = 60 * 60 * 1000

export function toOffsetMinutes(amount: number, unit: ReminderUnit) {
  if (unit === 'weeks') return amount * 7 * 24 * 60
  if (unit === 'days') return amount * 24 * 60
  return amount * 60
}

export function fromOffsetMinutes(offsetMinutes: number): { amount: number; unit: ReminderUnit } {
  if (offsetMinutes % (7 * 24 * 60) === 0) return { amount: offsetMinutes / (7 * 24 * 60), unit: 'weeks' }
  if (offsetMinutes % (24 * 60) === 0) return { amount: offsetMinutes / (24 * 60), unit: 'days' }
  return { amount: offsetMinutes / 60, unit: 'hours' }
}

export function reminderKind(offsetMinutes: number) {
  return `reminder.${offsetMinutes}m`
}

export function slackMs(offsetMs: number) {
  const half = Math.floor(offsetMs / 2)
  if (offsetMs <= 6 * HOUR_MS) return Math.min(4 * HOUR_MS, Math.max(HOUR_MS, half))
  return Math.min(36 * HOUR_MS, Math.max(HOUR_MS, half))
}

export function ruleFromMinutes(offsetMinutes: number): ReminderRule {
  const offsetMs = offsetMinutes * 60 * 1000
  return { offsetMs, slackMs: slackMs(offsetMs), kind: reminderKind(offsetMinutes) }
}

/** Reminder kinds whose send time has arrived and whose window is still open. */
export function dueReminderKinds(pickupAt: Date, createdAt: Date, now: Date, rules: ReminderRule[]) {
  const due: string[] = []
  for (const reminder of rules) {
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
  const match = /^reminder\.(\d+)m$/.exec(kind)
  if (!match) return 'soon'
  const minutes = Number(match[1])
  if (minutes % (7 * 24 * 60) === 0) {
    const weeks = minutes / (7 * 24 * 60)
    return weeks === 1 ? 'one week' : `${weeks} weeks`
  }
  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60)
    return days === 1 ? '1 day' : `${days} days`
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return hours === 1 ? '1 hour' : `${hours} hours`
  }
  return `${minutes} minutes`
}
