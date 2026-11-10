import { BookingStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const BLOCKING: BookingStatus[] = [
  BookingStatus.AWAITING_PAYMENT,
  BookingStatus.CONFIRMED,
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
]

export type AvailabilityWindow = {
  pickupAt: Date
  endsAt: Date
  vehicleId?: string | null
  driverId?: string | null
  excludeBookingId?: string
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}

/** Prevent double-booking the same driver or vehicle across overlapping windows. */
export async function checkAvailability(window: AvailabilityWindow) {
  const conflicts: { type: 'vehicle' | 'driver'; bookingRef: string }[] = []

  if (!window.vehicleId && !window.driverId) {
    return { available: true as const, conflicts }
  }

  const candidates = await prisma.booking.findMany({
    where: {
      status: { in: BLOCKING },
      pickupAt: { not: null },
      OR: [
        window.vehicleId ? { vehicleId: window.vehicleId } : undefined,
        window.driverId ? { driverId: window.driverId } : undefined,
      ].filter(Boolean) as object[],
      ...(window.excludeBookingId ? { id: { not: window.excludeBookingId } } : {}),
    },
    select: {
      id: true,
      ref: true,
      vehicleId: true,
      driverId: true,
      pickupAt: true,
      endsAt: true,
      durationMinutes: true,
    },
  })

  for (const b of candidates) {
    if (!b.pickupAt) continue
    const bEnd =
      b.endsAt ??
      new Date(b.pickupAt.getTime() + (b.durationMinutes ?? 60) * 60_000)
    if (!overlaps(window.pickupAt, window.endsAt, b.pickupAt, bEnd)) continue
    if (window.vehicleId && b.vehicleId === window.vehicleId) {
      conflicts.push({ type: 'vehicle', bookingRef: b.ref })
    }
    if (window.driverId && b.driverId === window.driverId) {
      conflicts.push({ type: 'driver', bookingRef: b.ref })
    }
  }

  return { available: conflicts.length === 0, conflicts }
}

export { computeEndsAt } from './pickup'
