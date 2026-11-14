/** Pickup date and time, stored as an Atlantic/Reykjavik instant (Iceland is UTC year-round). */

export const PICKUP_TIME_ZONE = 'Atlantic/Reykjavik'

export const PICKUP_LOCKED_STATUSES = ['COMPLETED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED', 'DRIVER_EN_ROUTE', 'IN_PROGRESS'] as const

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

const partFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: PICKUP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const labelFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: PICKUP_TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function canEditPickup(status: string) {
  return !PICKUP_LOCKED_STATUSES.includes(status as (typeof PICKUP_LOCKED_STATUSES)[number])
}

export function pickupParts(date: Date): { date: string; time: string } {
  const parts = partFormatter.formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  let hour = read('hour')
  if (hour === '24') hour = '00'
  return {
    date: `${read('year')}-${read('month')}-${read('day')}`,
    time: `${hour.padStart(2, '0')}:${read('minute').padStart(2, '0')}`,
  }
}

/** Interpret a date and time typed by the customer as the Iceland pickup instant. */
export function pickupInstant(date: string, time: string): Date | null {
  const dateMatch = DATE_RE.exec(date.trim())
  const timeMatch = TIME_RE.exec(time.trim())
  if (!dateMatch || !timeMatch) return null
  const isoDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
  const isoTime = `${timeMatch[1]}:${timeMatch[2]}`
  const parsed = new Date(`${isoDate}T${isoTime}:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return null
  const back = pickupParts(parsed)
  if (back.date !== isoDate || back.time !== isoTime) return null
  return parsed
}

export function formatPickupLabel(date: Date) {
  return `${labelFormatter.format(date)} · ${pickupParts(date).time}`
}

export function formatPickupConfirmation(date: Date) {
  return `Pickup updated to ${labelFormatter.format(date)} at ${pickupParts(date).time}.`
}

export function computeEndsAt(pickupAt: Date, durationMinutes: number, returnTrip?: boolean) {
  const minutes = Math.max(15, durationMinutes) * (returnTrip ? 2 : 1)
  return {
    durationMinutes: minutes,
    endsAt: new Date(pickupAt.getTime() + minutes * 60_000),
  }
}

export function returnTripFromExtras(extras: unknown) {
  if (!extras || typeof extras !== 'object' || Array.isArray(extras)) return false
  return Boolean((extras as { returnTrip?: unknown }).returnTrip)
}

export type PickupWrite = {
  pickupAt: Date
  endsAt: Date
}

/**
 * Fields written when a customer changes pickup.
 * Listing id, admin price, and the amount snapshot are intentionally absent.
 */
export function schedulePickupChange(input: {
  status: string
  durationMinutes?: number | null
  returnTrip?: boolean
  date: string
  time: string
}):
  | { ok: true; data: PickupWrite }
  | { ok: false; code: 'PICKUP_LOCKED' | 'VALIDATION_ERROR'; message: string } {
  if (!canEditPickup(input.status)) {
    return {
      ok: false,
      code: 'PICKUP_LOCKED',
      message: 'Pickup date and time cannot be changed once the trip is completed or cancelled.',
    }
  }
  const pickupAt = pickupInstant(input.date, input.time)
  if (!pickupAt) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Enter a valid pickup date and time.' }
  }
  const window = computeEndsAt(pickupAt, input.durationMinutes ?? 60, input.returnTrip)
  return { ok: true, data: { pickupAt, endsAt: window.endsAt } }
}

export function authorizePickupEdit(
  booking: { guestEmail: string | null | undefined },
  sessionEmail: string | null | undefined,
):
  | { ok: true }
  | { ok: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN'; message: string } {
  const session = sessionEmail?.trim().toLowerCase() || ''
  if (!session) {
    return { ok: false, code: 'UNAUTHENTICATED', message: 'Sign in as the customer for this booking.' }
  }
  const owner = booking.guestEmail?.trim().toLowerCase() || ''
  if (!owner || owner !== session) {
    return { ok: false, code: 'FORBIDDEN', message: 'Only the customer on this booking can change the pickup time.' }
  }
  return { ok: true }
}

export function customerPickupView(booking: {
  ref: string
  serviceLabel: string
  routeLabel: string
  status: string
  pickupAt: Date | null
  flightNumber?: string | null
  vehicleLabel?: string | null
  passengers: number
  driverName?: string | null
}) {
  const parts = booking.pickupAt ? pickupParts(booking.pickupAt) : null
  return {
    ref: booking.ref,
    serviceLabel: booking.serviceLabel,
    routeLabel: booking.routeLabel,
    status: booking.status,
    flightNumber: booking.flightNumber ?? null,
    vehicleLabel: booking.vehicleLabel ?? null,
    passengers: booking.passengers,
    driverName: booking.driverName ?? null,
    pickupAt: booking.pickupAt ? booking.pickupAt.toISOString() : null,
    pickupDate: parts?.date ?? '',
    pickupTime: parts?.time ?? '',
    pickupLabel: booking.pickupAt ? formatPickupLabel(booking.pickupAt) : 'Schedule to be confirmed',
    canEditPickup: canEditPickup(booking.status),
  }
}

/** Use the saved occupied window; return-trip duration must not double on each edit. */
export function existingPickupDuration(booking: { pickupAt: Date | null; endsAt: Date | null; durationMinutes: number | null; extras: unknown }) {
  if (booking.pickupAt && booking.endsAt && booking.endsAt > booking.pickupAt) return Math.max(1, Math.round((booking.endsAt.getTime() - booking.pickupAt.getTime()) / 60000))
  return Math.max(1, booking.durationMinutes || 60) * (returnTripFromExtras(booking.extras) ? 2 : 1)
}
