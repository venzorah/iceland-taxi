import { BookingStatus, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { makeBookingRef } from './refs'
import { buildQuote, type QuoteInput } from './pricing'
import { checkAvailability, computeEndsAt } from './availability'

export type CreateBookingInput = {
  guestName: string
  guestEmail: string
  guestPhone?: string
  serviceId?: string
  routeId?: string
  serviceLabel: string
  routeLabel: string
  pickupAt?: string | Date | null
  passengers: number
  luggage?: number
  flightNumber?: string
  vehicleId?: string
  vehicleLabel?: string
  driverId?: string
  notes?: string
  isQuote?: boolean
  extras?: QuoteInput['extras']
  quote: QuoteInput
  /** When true and Teya is unset, status becomes AWAITING_PAYMENT instead of failing pay. */
  awaitPaymentWithoutGateway?: boolean
}

export async function getIskPerUsd() {
  const rate = await prisma.exchangeRate.findFirst({ orderBy: { effective: 'desc' } })
  return rate?.iskPerUsd ?? 138
}

export async function quoteFromCatalogue(params: {
  routeId?: string
  vehicleId?: string
  pickup?: string
  destination?: string
  extras?: QuoteInput['extras']
  customerCategory: QuoteInput['customerCategory']
  currency?: QuoteInput['currency']
  depositPct?: number
}) {
  const iskPerUsd = await getIskPerUsd()
  let baseIsk = 22900
  let durationMinutes = 45
  let routeLabel = `${params.pickup || 'Pickup'} → ${params.destination || 'Destination'}`
  let serviceLabel = 'Airport transfer'
  let serviceId: string | undefined
  let routeId = params.routeId

  if (params.routeId) {
    const route = await prisma.route.findUnique({
      where: { id: params.routeId },
      include: { service: true },
    })
    if (route) {
      baseIsk = route.fromIsk
      durationMinutes = route.minutes ?? 45
      routeLabel = `${route.fromLabel} → ${route.toLabel}`
      serviceLabel = route.service?.titleEn || serviceLabel
      serviceId = route.serviceId || undefined
      routeId = route.id
    }
  } else if (params.pickup && params.destination) {
    const route = await prisma.route.findFirst({
      where: {
        active: true,
        fromLabel: { equals: params.pickup, mode: 'insensitive' },
        toLabel: { equals: params.destination, mode: 'insensitive' },
      },
      include: { service: true },
    })
    if (route) {
      baseIsk = route.fromIsk
      durationMinutes = route.minutes ?? 45
      routeLabel = `${route.fromLabel} → ${route.toLabel}`
      serviceLabel = route.service?.titleEn || serviceLabel
      serviceId = route.serviceId || undefined
      routeId = route.id
    }
  }

  let vehicleUpgradeIsk = 0
  let vehicleLabel: string | undefined
  if (params.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: params.vehicleId } })
    if (vehicle) {
      vehicleUpgradeIsk = vehicle.upgradeIsk
      vehicleLabel = vehicle.name
    }
  }

  const extrasRows = await prisma.pricingExtra.findMany({ where: { active: true } })
  const childSeatIsk = extrasRows.find((e) => e.key === 'childSeat')?.isk
  const meetGreetIsk = extrasRows.find((e) => e.key === 'meetGreet')?.isk

  const quote = buildQuote({
    baseIsk,
    vehicleUpgradeIsk,
    vehicleLabel,
    extras: params.extras,
    childSeatIsk,
    meetGreetIsk,
    customerCategory: params.customerCategory,
    currency: params.currency,
    iskPerUsd,
    depositPct: params.depositPct,
  })

  return {
    quote,
    meta: { baseIsk, durationMinutes, routeLabel, serviceLabel, serviceId, routeId, vehicleLabel, vehicleUpgradeIsk },
  }
}

export async function createBooking(input: CreateBookingInput) {
  const quoted = buildQuote(input.quote)
  const pickupAt = input.pickupAt ? new Date(input.pickupAt) : null
  const durationMinutes = input.quote.durationMinutes ?? 60
  const window = pickupAt
    ? computeEndsAt(pickupAt, durationMinutes, Boolean(input.extras?.returnTrip))
    : { durationMinutes, endsAt: null as Date | null }

  if (pickupAt && (input.vehicleId || input.driverId)) {
    const avail = await checkAvailability({
      pickupAt,
      endsAt: window.endsAt!,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
    })
    if (!avail.available) {
      return {
        ok: false as const,
        code: 'NOT_AVAILABLE' as const,
        message: 'Selected driver or vehicle is already booked for that time window.',
        conflicts: avail.conflicts,
      }
    }
  }

  let status: BookingStatus = BookingStatus.PENDING
  if (input.isQuote || quoted.amountSnapshot === 0) {
    status = BookingStatus.PENDING
  } else if (input.awaitPaymentWithoutGateway) {
    status = BookingStatus.AWAITING_PAYMENT
  } else {
    status = BookingStatus.AWAITING_PAYMENT
  }

  const booking = await prisma.booking.create({
    data: {
      ref: makeBookingRef(),
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      serviceId: input.serviceId,
      routeId: input.routeId,
      serviceLabel: input.serviceLabel,
      routeLabel: input.routeLabel,
      pickupAt,
      passengers: input.passengers,
      luggage: input.luggage ?? 0,
      flightNumber: input.flightNumber,
      vehicleId: input.vehicleId,
      vehicleLabel: input.vehicleLabel,
      driverId: input.driverId,
      status,
      currency: quoted.currency,
      amountSnapshot: quoted.amountSnapshot,
      amountIskSnapshot: quoted.amountIskSnapshot,
      depositAmount: quoted.depositAmount,
      customerCategory: quoted.customerCategory,
      notes: input.notes,
      extras: (input.extras ?? {}) as Prisma.InputJsonValue,
      priceLines: quoted.lines as unknown as Prisma.InputJsonValue,
      durationMinutes: window.durationMinutes,
      endsAt: window.endsAt,
      isQuote: Boolean(input.isQuote) || quoted.amountSnapshot === 0,
    },
    include: { payments: true, vehicle: true, driver: true },
  })

  return { ok: true as const, booking, quote: quoted }
}

export async function updateBookingStatus(
  ref: string,
  data: {
    status?: BookingStatus
    driverId?: string | null
    vehicleId?: string | null
    vehicleLabel?: string | null
    notes?: string
  },
) {
  const existing = await prisma.booking.findUnique({ where: { ref } })
  if (!existing) return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Booking not found' }

  if (existing.pickupAt && existing.endsAt && (data.driverId || data.vehicleId)) {
    const avail = await checkAvailability({
      pickupAt: existing.pickupAt,
      endsAt: existing.endsAt,
      vehicleId: data.vehicleId === undefined ? existing.vehicleId : data.vehicleId,
      driverId: data.driverId === undefined ? existing.driverId : data.driverId,
      excludeBookingId: existing.id,
    })
    if (!avail.available) {
      return {
        ok: false as const,
        code: 'NOT_AVAILABLE' as const,
        message: 'Cannot assign — resource already booked in this window.',
        conflicts: avail.conflicts,
      }
    }
  }

  let status = data.status
  if (!status && data.driverId) status = BookingStatus.DRIVER_ASSIGNED

  const booking = await prisma.booking.update({
    where: { ref },
    data: {
      status,
      driverId: data.driverId === undefined ? undefined : data.driverId,
      vehicleId: data.vehicleId === undefined ? undefined : data.vehicleId,
      vehicleLabel: data.vehicleLabel === undefined ? undefined : data.vehicleLabel,
      notes: data.notes,
    },
    include: { driver: true, vehicle: true, payments: true },
  })

  return { ok: true as const, booking }
}

export function toOpsBooking(b: {
  ref: string
  guestName: string | null
  serviceLabel: string
  routeLabel: string
  pickupAt: Date | null
  passengers: number
  vehicleLabel: string | null
  driver: { displayName: string } | null
  amountSnapshot: number
  currency: string
  status: string
  flightNumber: string | null
}) {
  const statusMap: Record<string, string> = {
    PENDING: 'Pending',
    AWAITING_PAYMENT: 'Awaiting Payment',
    CONFIRMED: 'Confirmed',
    DRIVER_ASSIGNED: 'Driver Assigned',
    ACKNOWLEDGED: 'Acknowledged',
    DRIVER_EN_ROUTE: 'Driver En Route',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REFUND_REQUESTED: 'Refund Requested',
    REFUNDED: 'Refunded',
  }
  return {
    ref: b.ref,
    customer: b.guestName || 'Guest',
    service: b.serviceLabel,
    route: b.routeLabel,
    time: b.pickupAt
      ? b.pickupAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '—',
    pax: b.passengers,
    vehicle: b.vehicleLabel || '—',
    driver: b.driver?.displayName ?? null,
    amount: b.amountSnapshot,
    currency: b.currency as 'USD' | 'ISK',
    status: statusMap[b.status] || b.status,
    flight: b.flightNumber || undefined,
  }
}
