import { BookingStatus, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { makeBookingRef } from './refs'
import { buildQuote, type QuoteInput } from './pricing'
import { checkAvailability, computeEndsAt } from './availability'
import {
  UNAVAILABLE_MESSAGE,
  matchListing,
  publishedListings,
  shownAdminPrice,
  type ListingKind,
  type PublishedListing,
} from './listings'

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
  listingId?: string
  listingKind?: ListingKind | string
  pickup?: string
  destination?: string
  /** When true and Teya is unset, status becomes AWAITING_PAYMENT instead of failing pay. */
  awaitPaymentWithoutGateway?: boolean
}

export async function getExchangeRates() {
  const rate = await prisma.exchangeRate.findFirst({ orderBy: { effective: 'desc' } })
  return {
    iskPerUsd: rate?.iskPerUsd ?? 138,
    iskPerEur: rate?.iskPerEur ?? 150,
  }
}

export async function getIskPerUsd() {
  return (await getExchangeRates()).iskPerUsd
}

export async function loadPublishedListings(): Promise<PublishedListing[]> {
  const [routes, services] = await Promise.all([
    prisma.route.findMany({ include: { service: true } }),
    prisma.service.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])
  return publishedListings(routes, services)
}

export async function quoteFromCatalogue(params: {
  listingId?: string
  listingKind?: string
  routeId?: string
  serviceId?: string
  pickup?: string
  destination?: string
  vehicleId?: string
  vehicleLabel?: string
  customerCategory: QuoteInput['customerCategory']
  currency?: QuoteInput['currency']
  depositPct?: number
}) {
  const listings = await loadPublishedListings()
  const listing = matchListing(listings, params)
  const price = shownAdminPrice(listing, params.pickup)
  if (!listing || price == null) {
    return { available: false as const, message: UNAVAILABLE_MESSAGE }
  }

  let vehicleUpgradeIsk = 0
  let pricedVehicleId: string | undefined
  let pricedVehicleLabel: string | undefined
  if (params.vehicleId || params.vehicleLabel) {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        active: true,
        ...(params.vehicleId ? { id: params.vehicleId } : { name: params.vehicleLabel }),
      },
    })
    if (!vehicle) {
      return { available: false as const, message: 'That vehicle is not available.' }
    }
    vehicleUpgradeIsk = Math.max(0, vehicle.upgradeIsk)
    pricedVehicleId = vehicle.id
    pricedVehicleLabel = vehicle.name
  }

  const { iskPerUsd, iskPerEur } = await getExchangeRates()
  const routeLabel = listing.kind === 'route' ? `${listing.fromLabel} → ${listing.toLabel}` : listing.title
  const quote = buildQuote({
    baseIsk: price,
    baseLabel: routeLabel,
    vehicleUpgradeIsk,
    vehicleLabel: pricedVehicleLabel,
    customerCategory: params.customerCategory,
    currency: params.currency,
    iskPerUsd,
    iskPerEur,
    depositPct: params.depositPct,
    durationMinutes: listing.minutes ?? undefined,
  })

  return {
    available: true as const,
    quote,
    meta: {
      baseIsk: price,
      adminPriceIsk: price,
      durationMinutes: listing.minutes ?? 60,
      routeLabel,
      serviceLabel: listing.title,
      serviceId: listing.serviceId || undefined,
      routeId: listing.routeId || undefined,
      listingId: listing.id,
      listingKind: listing.kind,
      vehicleId: pricedVehicleId,
      vehicleLabel: pricedVehicleLabel,
      vehicleUpgradeIsk,
    },
  }
}

export async function createBooking(input: CreateBookingInput) {
  const resolved = await quoteFromCatalogue({
    listingId: input.listingId,
    listingKind: input.listingKind,
    routeId: input.routeId,
    serviceId: input.serviceId,
    pickup: input.pickup,
    destination: input.destination,
    customerCategory: input.quote.customerCategory,
    currency: input.quote.currency,
    depositPct: input.quote.depositPct,
    vehicleId: input.vehicleId,
    vehicleLabel: input.vehicleLabel,
  })
  if (!resolved.available) {
    return { ok: false as const, code: 'UNAVAILABLE' as const, message: resolved.message }
  }
  const quoted = resolved.quote
  const pickupAt = input.pickupAt ? new Date(input.pickupAt) : null
  const durationMinutes = resolved.meta.durationMinutes || input.quote.durationMinutes || 60
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

  if (quoted.amountSnapshot <= 0 || resolved.meta.adminPriceIsk <= 0) {
    return { ok: false as const, code: 'UNAVAILABLE' as const, message: UNAVAILABLE_MESSAGE }
  }

  const status: BookingStatus = BookingStatus.AWAITING_PAYMENT

  const booking = await prisma.booking.create({
    data: {
      ref: makeBookingRef(),
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      serviceId: resolved.meta.serviceId,
      routeId: resolved.meta.routeId,
      listingId: resolved.meta.listingId,
      listingKind: resolved.meta.listingKind,
      adminPriceIsk: resolved.meta.adminPriceIsk,
      serviceLabel: resolved.meta.serviceLabel,
      routeLabel: resolved.meta.routeLabel,
      pickupAt,
      passengers: input.passengers,
      luggage: input.luggage ?? 0,
      flightNumber: input.flightNumber,
      vehicleId: resolved.meta.vehicleId,
      vehicleLabel: resolved.meta.vehicleLabel,
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
      isQuote: false,
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
        message: 'Cannot assign, resource already booked in this window.',
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
    currency: b.currency as 'USD' | 'ISK' | 'EUR',
    status: statusMap[b.status] || b.status,
    flight: b.flightNumber || undefined,
  }
}
