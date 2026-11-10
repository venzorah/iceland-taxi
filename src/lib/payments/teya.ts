import { getServerEnv, integrationConfigured } from '@/lib/env'
import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider } from './types'

/**
 * Teya payment adapter (https://teya.com/is).
 * Credentials are required for live/sandbox checkout. Without them we fail clearly
 * instead of simulating a successful charge.
 */
export class TeyaPaymentProvider implements PaymentProvider {
  readonly id = 'teya'
  readonly label = 'Teya'

  isConfigured() {
    return integrationConfigured('teya')
  }

  async createCheckout(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        provider: this.id,
        code: 'MISSING_CREDENTIALS',
        message:
          'Teya is not configured. Set TEYA_MERCHANT_ID and TEYA_API_KEY to enable payments.',
      }
    }

    const env = getServerEnv()

    // Scaffold stub: real Teya API wiring lands once merchant credentials are available.
    // We intentionally do not invent a fake success path.
    return {
      ok: false,
      provider: this.id,
      code: 'PROVIDER_ERROR',
      message: `Teya provider is configured (${env.TEYA_ENVIRONMENT}) but the live API client is not yet connected for booking ${input.bookingRef}.`,
    }
  }
}

export const teyaProvider = new TeyaPaymentProvider()
