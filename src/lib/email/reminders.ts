import { BookingStatus } from '@prisma/client'
import { prisma } from '@/lib/api'
import { notifyTripReminder } from './notices'
import { WEEK_MS, dueReminderKinds } from './schedule'

const CLOSED: BookingStatus[] = [BookingStatus.CANCELLED, BookingStatus.REFUNDED, BookingStatus.COMPLETED]

export async function sendDueReminders(now = new Date()) {
  const bookings = await prisma.booking.findMany({
    where: {
      pickupAt: { gt: now, lte: new Date(now.getTime() + WEEK_MS + 36 * 60 * 60 * 1000) },
      status: { notIn: CLOSED },
    },
    select: { id: true, pickupAt: true, createdAt: true },
  })
  let sentWindows = 0
  for (const booking of bookings) {
    if (!booking.pickupAt) continue
    const kinds = dueReminderKinds(booking.pickupAt, booking.createdAt, now)
    for (const kind of kinds) {
      await notifyTripReminder(booking.id, kind)
      sentWindows += 1
    }
  }
  return { checked: bookings.length, windows: sentWindows }
}
