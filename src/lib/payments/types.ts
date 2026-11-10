export type PaymentCurrency = 'USD' | 'ISK'

export type CreatePaymentInput = {
  bookingRef: string
  amount: number
  currency: PaymentCurrency
  description: string
  returnUrl: string
  cancelUrl: string
}

export type CreatePaymentResult =
  | {
      ok: true
      provider: string
      checkoutUrl: string
      providerRef: string
    }
  | {
      ok: false
      provider: string
      code: 'MISSING_CREDENTIALS' | 'PROVIDER_ERROR'
      message: string
    }

export interface PaymentProvider {
  readonly id: string
  readonly label: string
  isConfigured(): boolean
  createCheckout(input: CreatePaymentInput): Promise<CreatePaymentResult>
}
