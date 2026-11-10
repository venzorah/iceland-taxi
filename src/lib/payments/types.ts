export type PaymentCurrency = 'USD' | 'ISK' | 'EUR'

export type CreatePaymentInput = {
  bookingRef: string
  bookingId?: string
  amount: number
  currency: PaymentCurrency
  description: string
  returnUrl: string
  cancelUrl: string
  failureUrl?: string
  customer?: { name?: string; email?: string; phone?: string }
  /** When true, charge depositAmount instead of full amount if provided. */
  depositOnly?: boolean
  depositAmount?: number | null
  lineItems?: { name: string; quantity: number; unitAmount: number }[]
}

export type CreatePaymentResult =
  | {
      ok: true
      provider: string
      checkoutUrl: string
      providerRef: string
      paymentId?: string
      demo?: boolean
      message?: string
    }
  | {
      ok: false
      provider: string
      code: 'MISSING_CREDENTIALS' | 'PROVIDER_ERROR' | 'VALIDATION_ERROR'
      message: string
      demoBookingAllowed?: boolean
    }

export type PaymentStatusResult =
  | { ok: true; status: string; providerRef: string; raw?: unknown }
  | { ok: false; code: string; message: string }

export interface PaymentProvider {
  readonly id: string
  readonly label: string
  isConfigured(): boolean
  createCheckout(input: CreatePaymentInput): Promise<CreatePaymentResult>
  getSessionStatus?(providerRef: string): Promise<PaymentStatusResult>
}
