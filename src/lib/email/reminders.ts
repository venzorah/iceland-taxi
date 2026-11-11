import { BookingStatus } from '@prisma/client'
import { prisma } from '@/lib/api'
import { notifyTripReminder } from './notices'
import { activeReminderRules } from './reminder-settings'
import { dueReminderKinds } from './schedule'

const CLOSED: BookingStatus[] = [BookingStatus.CANCELLED, BookingStatus.REFUNDED, BookingStatus.COMPLETED]

export async function sendDueReminders(now = new Date()) {
  const rules = await activeReminderRules()
  if (rules.length === 0) return { checked: 0, windows: 0 }
  const furthest = Math.max(...rules.map((rule) => rule.offsetMs + rule.slackMs))
  const bookings = await prisma.booking.findMany({
    where: {
      pickupAt: { gt: now, lte: new Date(now.getTime() + furthest) },
      status: { notIn: CLOSED },
    },
    select: { id: true, pickupAt: true, createdAt: true },
  })
  let sentWindows = 0
  for (const booking of bookings) {
    if (!booking.pickupAt) continue
    const kinds = dueReminderKinds(booking.pickupAt, booking.createdAt, now, rules)
    for (const kind of kinds) {
      await notifyTripReminder(booking.id, kind)
      sentWindows += 1
    }
  }
  return { checked: bookings.length, windows: sentWindows }
}
