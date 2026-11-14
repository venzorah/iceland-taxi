import { BookingStatus, Prisma } from '@prisma/client'
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
  customerId?: string
  requestKey?: string
  requestHash?: string
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
  pickupAddress?: string
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
  if (!input.pickupAt || !Number.isFinite(new Date(input.pickupAt).getTime()) || new Date(input.pickupAt) <= new Date()) return { ok: false as const, code: 'INVALID_PICKUP' as const, message: 'Select a future pickup date and time in Iceland.' }
  if (!input.vehicleId) return { ok: false as const, code: 'VEHICLE_REQUIRED' as const, message: 'Select an available vehicle.' }
  const selectedVehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } })
  if (!selectedVehicle?.active || input.passengers > selectedVehicle.pax || (input.luggage ?? 0) > selectedVehicle.bags) return { ok: false as const, code: 'CAPACITY_EXCEEDED' as const, message: 'Choose a vehicle with enough passenger and luggage capacity.' }

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

  if (quoted.amountSnapshot <= 0 || resolved.meta.adminPriceIsk <= 0) {
    return { ok: false as const, code: 'UNAVAILABLE' as const, message: UNAVAILABLE_MESSAGE }
  }

  const status: BookingStatus = BookingStatus.AWAITING_PAYMENT

  let outcome
  try {
    outcome = await prisma.$transaction(async tx => {
  if (pickupAt && (input.vehicleId || input.driverId)) {
    const avail = await checkAvailability({
      pickupAt,
      endsAt: window.endsAt!,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
    }, tx)
    if (!avail.available) {
      return {
        ok: false as const,
        code: 'NOT_AVAILABLE' as const,
        message: 'Selected driver or vehicle is already booked for that time window.',
        conflicts: avail.conflicts,
      }
    }
  }

  const booking = await tx.booking.create({
    data: {
      ref: makeBookingRef(),
      customerId: input.customerId,
      requestKey: input.requestKey,
      requestHash: input.requestHash,
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
      pickupAddress: input.pickupAddress?.trim() || null,
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

      return { ok: true as const, booking }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2034') return { ok: false as const, code: 'NOT_AVAILABLE' as const, message: 'Availability changed. Please choose another pickup time or vehicle.' }
    throw error
  }
  if (!outcome.ok) return outcome
  const booking = outcome.booking

  try {
    const { notifyBookingCreated } = await import('@/lib/email/notices')
    await notifyBookingCreated(booking.id)
  } catch (error) {
    console.error(error)
  }

  return { ok: true as const, booking, quote: quoted }
}

export async function updateBookingStatus(
  ref: string,
  data: {
    status?: BookingStatus
    expectedStatus?: BookingStatus
    driverId?: string | null
    vehicleId?: string | null
    vehicleLabel?: string | null
    pickupAddress?: string | null
    notes?: string
  },
) {
  let result
  try {
    result = await prisma.$transaction(async tx => {
      const existing = await tx.booking.findUnique({ where: { ref }, include: { payments: true } })
      if (!existing) return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Booking not found.' }
      if (data.expectedStatus && existing.status !== data.expectedStatus) return { ok: false as const, code: 'BOOKING_CHANGED' as const, message: 'This booking changed. Refresh before saving.' }
      const driverId = data.driverId === undefined ? existing.driverId : data.driverId
      const vehicleId = data.vehicleId === undefined ? existing.vehicleId : data.vehicleId
      const changingAssignment = driverId !== existing.driverId || vehicleId !== existing.vehicleId
      const terminal = ['COMPLETED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'].includes(existing.status)
      if (terminal && (changingAssignment || (data.status && data.status !== existing.status))) return { ok: false as const, code: 'BOOKING_LOCKED' as const, message: 'This closed booking cannot be reassigned or reopened.' }
      if (changingAssignment && ['DRIVER_EN_ROUTE','IN_PROGRESS'].includes(existing.status)) return { ok: false as const, code: 'JOURNEY_STARTED' as const, message: 'A journey in progress cannot be reassigned.' }
      if (data.status === 'REFUNDED' && existing.status !== 'REFUNDED') return { ok: false as const, code: 'REFUND_NOT_VERIFIED' as const, message: 'Only a verified provider refund can mark a booking refunded.' }
      if (driverId && changingAssignment) {
        const driver = await tx.driver.findFirst({ where: { id: driverId, active: true } })
        if (!driver || driver.status === 'Unavailable' || driver.status === 'Off duty') return { ok: false as const, code: 'DRIVER_UNAVAILABLE' as const, message: 'Choose an active, available driver.' }
      }
      if (vehicleId && changingAssignment) {
        const vehicle = await tx.vehicle.findFirst({ where: { id: vehicleId, active: true } })
        if (!vehicle || vehicle.pax < existing.passengers || vehicle.bags < existing.luggage) return { ok: false as const, code: 'VEHICLE_UNAVAILABLE' as const, message: 'Choose an active vehicle with enough passenger and luggage capacity.' }
      }
      if (changingAssignment && existing.pickupAt && existing.endsAt) {
        const avail = await checkAvailability({ pickupAt: existing.pickupAt, endsAt: existing.endsAt, driverId, vehicleId, excludeBookingId: existing.id }, tx)
        if (!avail.available) return { ok: false as const, code: 'NOT_AVAILABLE' as const, message: 'Cannot assign: driver or vehicle is already booked in this window.' }
      }
      let status = data.status || existing.status
      if (driverId !== existing.driverId && driverId) status = BookingStatus.DRIVER_ASSIGNED
      if (!driverId && ['DRIVER_ASSIGNED','ACKNOWLEDGED','DRIVER_EN_ROUTE','IN_PROGRESS'].includes(status)) {
        if (data.status && data.status !== existing.status) return { ok: false as const, code: 'DRIVER_REQUIRED' as const, message: 'Assign a driver before using a driver journey status.' }
        status = BookingStatus.CONFIRMED
      }
      if (driverId && ['DRIVER_EN_ROUTE','IN_PROGRESS'].includes(status)) {
        const driver = await tx.driver.findFirst({where:{id:driverId,active:true}})
        const ongoing = await tx.booking.count({where:{driverId,id:{not:existing.id},status:{in:['DRIVER_EN_ROUTE','IN_PROGRESS']}}})
        if (!driver || ongoing) return {ok:false as const,code:'DRIVER_BUSY' as const,message:'This driver is inactive or already on another journey.'}
      }
      if (status === 'CANCELLED' && existing.payments.some(p => ['CAPTURED','AUTHORIZED'].includes(p.status))) status = BookingStatus.REFUND_REQUESTED
      const booking = await tx.booking.update({ where: { id: existing.id }, data: { status, driverId, vehicleId, vehicleLabel: data.vehicleLabel, pickupAddress: data.pickupAddress === undefined ? undefined : data.pickupAddress?.trim() || null, notes: data.notes }, include: { driver: true, vehicle: true, payments: true } })
      // A staff action must keep the same availability state as a driver action.
      for (const id of new Set([existing.driverId,driverId].filter((id): id is string => !!id))) {
        const ongoing = await tx.booking.count({ where: { driverId: id, status: { in: ['DRIVER_EN_ROUTE','IN_PROGRESS'] } } })
        const driver = await tx.driver.findUnique({ where:{id} })
        if (driver) await tx.driver.update({ where:{id}, data:{status:ongoing ? 'On trip' : driver.status === 'On trip' ? 'Available' : driver.status} })
      }
      return { ok: true as const, booking, before: { status: existing.status, driverId: existing.driverId } }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait:10000, timeout:20000 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2034') return { ok:false as const, code:'BOOKING_CHANGED' as const, message:'Availability changed. Refresh before assigning.' }
    throw error
  }
  if (!result.ok) return result
  try {
    const { notifyBookingUpdated } = await import('@/lib/email/notices')
    await notifyBookingUpdated(result.before, result.booking.id)
  } catch { console.warn('[booking] Update saved; notification preparation failed.') }
  return { ok: true as const, booking: result.booking }
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
  driverId?: string | null
  notes?: string | null
  amountSnapshot: number
  currency: string
  status: string
  flightNumber: string | null
  pickupAddress?: string | null
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
      ? b.pickupAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik' })
      : '—',
    pax: b.passengers,
    vehicle: b.vehicleLabel || '—',
    driver: b.driver?.displayName ?? null,
    driverId: b.driverId ?? null,
    notes: b.notes ?? null,
    pickupAt: b.pickupAt?.toISOString() ?? null,
    amount: b.amountSnapshot,
    currency: b.currency as 'USD' | 'ISK' | 'EUR',
    status: statusMap[b.status] || b.status,
    flight: b.flightNumber || undefined,
    pickupAddress: b.pickupAddress?.trim() || null,
  }
}
