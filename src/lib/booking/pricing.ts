import type { CurrencyCode, CustomerCategory } from '@prisma/client'

export type PriceLine = { key: string; label: string; isk: number }

export type QuoteInput = {
  baseIsk: number
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
  currency?: CurrencyCode | 'USD' | 'ISK'
  iskPerUsd?: number
  depositPct?: number
}

export type QuoteResult = {
  lines: PriceLine[]
  totalIsk: number
  currency: 'USD' | 'ISK'
  amountSnapshot: number
  amountIskSnapshot: number
  depositAmount: number | null
  iskPerUsd: number
  customerCategory: 'INTERNATIONAL' | 'RESIDENT'
}

const DEFAULT_EXTRAS = { childSeat: 2500, meetGreet: 0, returnDiscountPct: 10 }

export function normalizeCategory(
  c: QuoteInput['customerCategory'],
): 'INTERNATIONAL' | 'RESIDENT' {
  const v = String(c).toUpperCase()
  return v === 'RESIDENT' ? 'RESIDENT' : 'INTERNATIONAL'
}

export function resolveCurrency(
  category: 'INTERNATIONAL' | 'RESIDENT',
  preferred?: string,
): 'USD' | 'ISK' {
  if (category === 'INTERNATIONAL') return 'USD'
  return preferred === 'ISK' ? 'ISK' : preferred === 'USD' ? 'USD' : 'ISK'
}

export function formatDisplayAmount(amount: number, currency: 'USD' | 'ISK') {
  if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`
  return `${amount.toLocaleString('en-US').replace(/,/g, '.')} kr`
}

export function iskToUsd(isk: number, iskPerUsd: number) {
  return Math.round(isk / iskPerUsd)
}

/** Build a snapshotted quote. Historical bookings keep these amounts forever. */
export function buildQuote(input: QuoteInput): QuoteResult {
  const category = normalizeCategory(input.customerCategory)
  const iskPerUsd = input.iskPerUsd && input.iskPerUsd > 0 ? input.iskPerUsd : 138
  const currency = resolveCurrency(category, input.currency)
  const extras = input.extras ?? {}
  const lines: PriceLine[] = [
    { key: 'base', label: 'Base transfer', isk: Math.max(0, input.baseIsk) },
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
  const amountSnapshot = currency === 'USD' ? iskToUsd(totalIsk, iskPerUsd) : totalIsk
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
    customerCategory: category,
  }
}

/** Teya expects minor units. ISK has no minor unit; USD uses cents. */
export function toTeyaMinorUnits(amountSnapshot: number, currency: 'USD' | 'ISK') {
  if (currency === 'USD') return Math.round(amountSnapshot * 100)
  return Math.round(amountSnapshot)
}
