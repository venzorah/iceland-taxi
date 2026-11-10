import type { CurrencyCode, CustomerCategory } from '@prisma/client'

export type PriceLine = { key: string; label: string; isk: number }

export type QuoteInput = {
  baseIsk: number
  baseLabel?: string
  vehicleUpgradeIsk?: number
  vehicleLabel?: string
  extras?: {
    childSeat?: boolean
    returnTrip?: boolean
    meetGreet?: boolean
  }
  childSeatIsk?: number
  meetGreetIsk?: number
  returnDiscountPct?: number
  durationMinutes?: number
  customerCategory: CustomerCategory | 'INTERNATIONAL' | 'RESIDENT' | 'international' | 'resident'
  currency?: CurrencyCode | 'USD' | 'ISK' | 'EUR'
  iskPerUsd?: number
  iskPerEur?: number
  depositPct?: number
}

export type ChargeCurrency = 'EUR' | 'ISK' | 'USD'

export type QuoteResult = {
  lines: PriceLine[]
  totalIsk: number
  currency: ChargeCurrency
  amountSnapshot: number
  amountIskSnapshot: number
  depositAmount: number | null
  iskPerUsd: number
  iskPerEur: number
  customerCategory: 'INTERNATIONAL' | 'RESIDENT'
}

const DEFAULT_EXTRAS = { childSeat: 2500, meetGreet: 0, returnDiscountPct: 10 }

export function normalizeCategory(
  c: QuoteInput['customerCategory'],
): 'INTERNATIONAL' | 'RESIDENT' {
  const v = String(c).toUpperCase()
  return v === 'RESIDENT' ? 'RESIDENT' : 'INTERNATIONAL'
}

/**
 * International visitors are charged in EUR.
 * Residents pay ISK, or EUR when they choose it.
 * A legacy USD preference is charged in EUR (public checkout no longer offers USD).
 */
export function resolveCurrency(
  category: 'INTERNATIONAL' | 'RESIDENT',
  preferred?: string,
): ChargeCurrency {
  if (category === 'INTERNATIONAL') return 'EUR'
  if (preferred === 'ISK') return 'ISK'
  if (preferred === 'EUR' || preferred === 'USD') return 'EUR'
  return 'ISK'
}

export function formatDisplayAmount(amount: number, currency: ChargeCurrency) {
  if (currency === 'ISK') return `ISK ${Math.round(amount).toLocaleString('en-US')}`
  if (currency === 'EUR') return `€${Math.round(amount).toLocaleString('en-US').replace(/,/g, '.')}`
  return `$${Math.round(amount).toLocaleString('en-US')}`
}

export function iskToUsd(isk: number, iskPerUsd: number) {
  return Math.round(isk / iskPerUsd)
}

export function iskToEur(isk: number, iskPerEur: number) {
  return Math.round(isk / iskPerEur)
}

/** Build a snapshotted quote. Historical bookings keep these amounts forever. */
export function buildQuote(input: QuoteInput): QuoteResult {
  const category = normalizeCategory(input.customerCategory)
  const iskPerUsd = input.iskPerUsd && input.iskPerUsd > 0 ? input.iskPerUsd : 138
  const iskPerEur = input.iskPerEur && input.iskPerEur > 0 ? input.iskPerEur : 150
  const currency = resolveCurrency(category, input.currency)
  const extras = input.extras ?? {}
  const lines: PriceLine[] = [
    { key: 'listing', label: input.baseLabel || 'Published price', isk: Math.max(0, input.baseIsk) },
  ]

  if (input.vehicleUpgradeIsk && input.vehicleUpgradeIsk > 0) {
    lines.push({
      key: 'vehicle',
      label: `${input.vehicleLabel || 'Vehicle'} upgrade`,
      isk: input.vehicleUpgradeIsk,
    })
  }
  if (extras.meetGreet) {
    lines.push({
      key: 'meetGreet',
      label: 'Meet & greet at arrivals',
      isk: input.meetGreetIsk ?? DEFAULT_EXTRAS.meetGreet,
    })
  }
  if (extras.childSeat) {
    lines.push({
      key: 'childSeat',
      label: 'Child seat',
      isk: input.childSeatIsk ?? DEFAULT_EXTRAS.childSeat,
    })
  }
  if (extras.returnTrip) {
    const returnBase = input.baseIsk + (input.vehicleUpgradeIsk ?? 0)
    const pct = input.returnDiscountPct ?? DEFAULT_EXTRAS.returnDiscountPct
    lines.push({ key: 'return', label: 'Return journey', isk: returnBase })
    lines.push({
      key: 'returnDiscount',
      label: `Return discount (${pct}%)`,
      isk: -Math.round(returnBase * (pct / 100)),
    })
  }

  const totalIsk = lines.reduce((s, l) => s + l.isk, 0)
  const amountSnapshot =
    currency === 'EUR' ? iskToEur(totalIsk, iskPerEur) : currency === 'USD' ? iskToUsd(totalIsk, iskPerUsd) : totalIsk
  const depositPct = input.depositPct
  const depositAmount =
    typeof depositPct === 'number' && depositPct > 0 && depositPct < 100
      ? Math.round(amountSnapshot * (depositPct / 100))
      : null

  return {
    lines,
    totalIsk,
    currency,
    amountSnapshot,
    amountIskSnapshot: totalIsk,
    depositAmount,
    iskPerUsd,
    iskPerEur,
    customerCategory: category,
  }
}

/** Teya minor units. ISK has none; EUR and USD use cents. */
export function toTeyaMinorUnits(amountSnapshot: number, currency: ChargeCurrency) {
  if (currency === 'EUR' || currency === 'USD') return Math.round(amountSnapshot * 100)
  return Math.round(amountSnapshot)
}
