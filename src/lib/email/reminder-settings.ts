import { prisma } from '@/lib/api'
import { DEFAULT_REMINDER_MINUTES, type ReminderUnit, fromOffsetMinutes, ruleFromMinutes, toOffsetMinutes } from './schedule'

const MAX_MINUTES = 90 * 24 * 60

export async function ensureTripReminders() {
  const count = await prisma.tripReminder.count()
  if (count > 0) return
  await prisma.tripReminder.createMany({
    data: DEFAULT_REMINDER_MINUTES.map((offsetMinutes, index) => ({
      offsetMinutes,
      active: true,
      sortOrder: index,
    })),
    skipDuplicates: true,
  })
}

export async function activeReminderRules() {
  await ensureTripReminders()
  const rows = await prisma.tripReminder.findMany({ where: { active: true }, orderBy: { offsetMinutes: 'desc' } })
  return rows.map((row) => ruleFromMinutes(row.offsetMinutes))
}

export function presentReminder(offsetMinutes: number, active: boolean, id: string) {
  const parts = fromOffsetMinutes(offsetMinutes)
  return { id, amount: parts.amount, unit: parts.unit, active, offsetMinutes }
}

export function parseReminderInput(input: { amount: number; unit: ReminderUnit; active: boolean }) {
  if (!Number.isInteger(input.amount) || input.amount < 1) {
    return { ok: false as const, message: 'Each reminder needs a whole number of at least 1.' }
  }
  if (input.unit !== 'hours' && input.unit !== 'days' && input.unit !== 'weeks') {
    return { ok: false as const, message: 'Choose hours, days, or weeks.' }
  }
  const offsetMinutes = toOffsetMinutes(input.amount, input.unit)
  if (offsetMinutes > MAX_MINUTES) {
    return { ok: false as const, message: 'A reminder cannot be more than 90 days before the trip.' }
  }
  return { ok: true as const, offsetMinutes, active: input.active }
}
