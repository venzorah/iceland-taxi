import { BookingStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { checkAvailability } from '@/lib/booking/availability'

const DRIVER_FLOW: BookingStatus[] = [
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.ACKNOWLEDGED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
]

export const DRIVER_STATUS_LABEL: Record<string, string> = {
  DRIVER_ASSIGNED: 'Driver Assigned',
  ACKNOWLEDGED: 'Acknowledged',
  DRIVER_EN_ROUTE: 'Driver En Route',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
}

export function nextDriverStatus(current: BookingStatus): BookingStatus | null {
  const i = DRIVER_FLOW.indexOf(current)
  if (i < 0 || i >= DRIVER_FLOW.length - 1) return null
  return DRIVER_FLOW[i + 1]
}

export function driverActionLabel(status: BookingStatus): string | null {
  switch (status) {
    case BookingStatus.DRIVER_ASSIGNED:
      return 'Acknowledge assignment'
    case BookingStatus.ACKNOWLEDGED:
      return 'Start driving to pickup'
    case BookingStatus.DRIVER_EN_ROUTE:
      return 'Passenger picked up'
    case BookingStatus.IN_PROGRESS:
      return 'Complete journey'
    default:
      return null
  }
}

export async function listDriverBookings(driverId: string) {
  const bookings = await prisma.booking.findMany({
    where: { driverId },
    include: { vehicle: true },
    orderBy: [{ pickupAt: 'asc' }, { createdAt: 'desc' }],
  })
  return bookings.map(toDriverJob)
}

export function toDriverJob(b: {
  ref: string
  guestName: string | null
  guestPhone: string | null
  guestEmail: string | null
  serviceLabel: string
  routeLabel: string
  pickupAt: Date | null
  passengers: number
  luggage: number
  flightNumber: string | null
  pickupAddress?: string | null
  vehicleLabel: string | null
  notes: string | null
  status: BookingStatus
  extras: unknown
  vehicle: { plate: string | null; name: string } | null
}) {
  const [pickup, dropoff] = splitRoute(b.routeLabel)
  const pickupAddress = addressForDriver(b.pickupAddress, b.notes)
  return {
    ref: b.ref,
    customer: b.guestName || 'Guest',
    phone: b.guestPhone,
    email: b.guestEmail,
    service: b.serviceLabel,
    route: b.routeLabel,
    pickup,
    dropoff,
    pickupAddress,
    mapUrl: pickupAddress ? googleMapsUrl(pickupAddress) : googleMapsUrl(pickup),
    pickupAt: b.pickupAt?.toISOString() || null,
    time: b.pickupAt
      ? b.pickupAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik' })
      : '—',
    dateLabel: b.pickupAt
      ? b.pickupAt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Atlantic/Reykjavik' })
      : '—',
    pax: b.passengers,
    bags: b.luggage,
    flight: b.flightNumber,
    vehicle: b.vehicleLabel || b.vehicle?.name || '—',
    plate: b.vehicle?.plate || null,
    notes: b.notes,
    extras: b.extras,
    status: b.status,
    statusLabel: DRIVER_STATUS_LABEL[b.status] || b.status,
    nextAction: driverActionLabel(b.status),
  }
}

export function googleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function addressForDriver(pickupAddress?: string | null, notes?: string | null) {
  const direct = pickupAddress?.trim()
  if (direct) return direct
  const saved = notes?.match(/Pickup address:\s*(.+)/)?.[1]?.trim()
  return saved || null
}

function splitRoute(label: string) {
  const parts = label.split(/\s*→\s*|\s*->\s*/)
  if (parts.length >= 2) return [parts[0].trim(), parts.slice(1).join(' → ').trim()] as const
  return [label, '—'] as const
}

/** Expected state makes a repeated button request idempotent; no skipped journey steps. */
export async function advanceDriverBooking(driverId: string, ref: string, expectedStatus: BookingStatus) {
  try {
    return await prisma.$transaction(async tx => {
      const driver = await tx.driver.findFirst({ where: { id: driverId, active: true } })
      const booking = await tx.booking.findFirst({ where: { ref, driverId } })
      if (!driver || !booking) return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Assigned journey not found.' }
      const next = nextDriverStatus(expectedStatus)
      if (!next) return { ok: false as const, code: 'INVALID_STATE' as const, message: 'This journey cannot advance.' }
      if (booking.status === next) {
        const current = await tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { vehicle: true } })
        return { ok: true as const, job: toDriverJob(current) }
      }
      if (booking.status !== expectedStatus) return { ok: false as const, code: 'BOOKING_CHANGED' as const, message: 'This journey changed. Refresh before continuing.' }
      if (booking.pickupAt && booking.endsAt && next !== BookingStatus.COMPLETED) {
        const avail = await checkAvailability({ pickupAt: booking.pickupAt, endsAt: booking.endsAt, driverId, vehicleId: booking.vehicleId, excludeBookingId: booking.id }, tx)
        if (!avail.available) return { ok: false as const, code: 'NOT_AVAILABLE' as const, message: 'Conflict with another assigned journey. Contact operations.' }
      }
      if (next === BookingStatus.DRIVER_EN_ROUTE || next === BookingStatus.IN_PROGRESS) {
        const ongoing = await tx.booking.count({ where: { driverId, id: { not: booking.id }, status: { in: ['DRIVER_EN_ROUTE', 'IN_PROGRESS'] } } })
        if (ongoing) return { ok: false as const, code: 'ON_ANOTHER_TRIP' as const, message: 'Finish your current journey before starting another.' }
      }
      const changed = await tx.booking.updateMany({ where: { id: booking.id, driverId, status: expectedStatus }, data: { status: next } })
      if (!changed.count) return { ok: false as const, code: 'BOOKING_CHANGED' as const, message: 'This journey changed. Refresh before continuing.' }
      const ongoing = await tx.booking.count({ where: { driverId, status: { in: ['DRIVER_EN_ROUTE', 'IN_PROGRESS'] } } })
      await tx.driver.update({ where: { id: driverId }, data: { status: ongoing ? 'On trip' : driver.status === 'Unavailable' ? 'Unavailable' : 'Available' } })
      const updated = await tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { vehicle: true } })
      return { ok: true as const, job: toDriverJob(updated) }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2034') return { ok: false as const, code: 'BOOKING_CHANGED' as const, message: 'This journey changed. Refresh before continuing.' }
    throw error
  }
}
