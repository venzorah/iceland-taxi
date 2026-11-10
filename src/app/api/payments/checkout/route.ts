import { PaymentStatus } from '@prisma/client'
import { z } from 'zod'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { getPaymentProvider } from '@/lib/payments'
import { createBooking, quoteFromCatalogue } from '@/lib/booking/service'

const schema = z.object({
  // Existing booking
  bookingRef: z.string().optional(),
  // Or create booking + pay in one step
  create: z
    .object({
      guestName: z.string().min(1),
      guestEmail: z.string().email(),
      guestPhone: z.string().optional(),
      serviceLabel: z.string().min(1),
      routeLabel: z.string().min(1),
      pickupAt: z.string().datetime().optional().nullable(),
      passengers: z.number().int().positive().default(1),
      luggage: z.number().int().nonnegative().default(0),
      flightNumber: z.string().optional(),
      vehicleId: z.string().optional(),
      vehicleLabel: z.string().optional(),
      routeId: z.string().optional(),
      serviceId: z.string().optional(),
      extras: z
        .object({
          childSeat: z.boolean().optional(),
          returnTrip: z.boolean().optional(),
          meetGreet: z.boolean().optional(),
        })
        .optional(),
      customerCategory: z.enum(['INTERNATIONAL', 'RESIDENT', 'international', 'resident']),
      currency: z.enum(['USD', 'ISK', 'EUR']).optional(),
      notes: z.string().optional(),
      isQuote: z.boolean().optional(),
      depositPct: z.number().min(0).max(100).optional(),
    })
    .optional(),
  amount: z.number().positive().optional(),
  currency: z.enum(['USD', 'ISK', 'EUR']).optional(),
  description: z.string().default('Iceland Taxi Booking'),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  depositOnly: z.boolean().optional(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid checkout payload', { issues: parsed.error.flatten() })
  }
  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required for checkout')
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  let bookingRef = parsed.data.bookingRef
  let booking = bookingRef
    ? await prisma.booking.findUnique({ where: { ref: bookingRef }, include: { payments: true } })
    : null

  if (!booking && parsed.data.create) {
    const c = parsed.data.create
    if (c.isQuote) {
      const q = await quoteFromCatalogue({
        routeId: c.routeId,
        vehicleId: c.vehicleId,
        pickup: c.routeLabel.split('→')[0]?.trim(),
        destination: c.routeLabel.split('→')[1]?.trim(),
        extras: c.extras,
        customerCategory: c.customerCategory,
        currency: c.currency,
        depositPct: c.depositPct,
      })
      const created = await createBooking({
        ...c,
        quote: {
          baseIsk: q.meta.baseIsk,
          vehicleUpgradeIsk: q.meta.vehicleUpgradeIsk,
          vehicleLabel: c.vehicleLabel || q.meta.vehicleLabel,
          extras: c.extras,
          durationMinutes: q.meta.durationMinutes,
          customerCategory: c.customerCategory,
          currency: c.currency,
          iskPerUsd: q.quote.iskPerUsd,
          iskPerEur: q.quote.iskPerEur,
          depositPct: c.depositPct,
        },
        serviceId: c.serviceId || q.meta.serviceId,
        routeId: c.routeId || q.meta.routeId,
        isQuote: true,
        awaitPaymentWithoutGateway: true,
      })
      if (!created.ok) return jsonError(409, created.code, created.message, { conflicts: created.conflicts })
      booking = created.booking
      bookingRef = created.booking.ref
      return jsonOk({
        ok: true,
        demo: true,
        booking,
        message: 'Quotation request saved as Pending. No payment collected.',
      })
    }

    const q = await quoteFromCatalogue({
      routeId: c.routeId,
      vehicleId: c.vehicleId,
      extras: c.extras,
      customerCategory: c.customerCategory,
      currency: c.currency,
      depositPct: c.depositPct,
    })
    const created = await createBooking({
      ...c,
      quote: {
        baseIsk: q.meta.baseIsk,
        vehicleUpgradeIsk: q.meta.vehicleUpgradeIsk,
        vehicleLabel: c.vehicleLabel || q.meta.vehicleLabel,
        extras: c.extras,
        durationMinutes: q.meta.durationMinutes,
        customerCategory: c.customerCategory,
        currency: c.currency,
        iskPerUsd: q.quote.iskPerUsd,
        iskPerEur: q.quote.iskPerEur,
        depositPct: c.depositPct,
      },
      serviceId: c.serviceId || q.meta.serviceId,
      routeId: c.routeId || q.meta.routeId,
      serviceLabel: c.serviceLabel || q.meta.serviceLabel,
      routeLabel: c.routeLabel || q.meta.routeLabel,
      awaitPaymentWithoutGateway: true,
    })
    if (!created.ok) return jsonError(409, created.code, created.message, { conflicts: created.conflicts })
    booking = created.booking
    bookingRef = created.booking.ref
  }

  if (!booking || !bookingRef) {
    return jsonError(400, 'VALIDATION_ERROR', 'Provide bookingRef or create payload')
  }

  const amount = parsed.data.amount ?? booking.amountSnapshot
  const currency = parsed.data.currency ?? booking.currency
  const provider = getPaymentProvider()
  const returnBase = `${origin}/api/payments/teya/return?ref=${encodeURIComponent(bookingRef)}`
  const result = await provider.createCheckout({
    bookingRef,
    bookingId: booking.id,
    amount,
    currency,
    description: parsed.data.description,
    returnUrl: parsed.data.returnUrl || `${returnBase}&result=success`,
    cancelUrl: parsed.data.cancelUrl || `${returnBase}&result=cancel`,
    failureUrl: `${returnBase}&result=failure`,
    customer: {
      name: booking.guestName || undefined,
      email: booking.guestEmail || undefined,
      phone: booking.guestPhone || undefined,
    },
    depositOnly: parsed.data.depositOnly,
    depositAmount: booking.depositAmount,
  })

  if (!result.ok) {
    if (result.code === 'MISSING_CREDENTIALS') {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          provider: provider.id,
          status: PaymentStatus.REQUIRES_CREDENTIALS,
          currency,
          amount,
          failureReason: result.message,
        },
      })
    }
    const status = result.code === 'MISSING_CREDENTIALS' ? 503 : result.code === 'VALIDATION_ERROR' ? 400 : 502
    return jsonError(status, result.code, result.message, {
      provider: result.provider,
      bookingRef,
      paid: false,
      gatewayCalled: false,
    })
  }

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider: result.provider,
      status: PaymentStatus.PENDING,
      currency,
      amount,
      providerRef: result.providerRef,
      checkoutUrl: result.checkoutUrl,
      raw: result as object,
    },
  })

  return jsonOk({
    ok: true,
    demo: false,
    booking,
    payment,
    checkoutUrl: result.checkoutUrl,
    providerRef: result.providerRef,
    provider: result.provider,
  })
}
