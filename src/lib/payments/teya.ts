import { createHmac, timingSafeEqual } from 'crypto'
import { teyaCredentials } from '@/lib/env'
import { toTeyaMinorUnits } from '@/lib/booking/pricing'
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatusResult,
} from './types'

type TokenCache = { accessToken: string; expiresAt: number }

let tokenCache: TokenCache | null = null

function apiBase(environment: 'sandbox' | 'production') {
  return environment === 'production' ? 'https://api.teya.com' : 'https://api.teya.xyz'
}

function oauthBase(environment: 'sandbox' | 'production') {
  return environment === 'production'
    ? 'https://id.teya.com/oauth/v2/oauth-token'
    : 'https://id.teya.xyz/oauth/v2/oauth-token'
}

/**
 * Teya Online Payments — Hosted Checkout
 * Docs: https://docs.teya.com/online-payments/hosted-checkout/get-started
 *
 * Never stores card details; customer pays on Teya-hosted session_url.
 */
export class TeyaPaymentProvider implements PaymentProvider {
  readonly id = 'teya'
  readonly label = 'Teya'

  isConfigured() {
    return teyaCredentials().configured
  }

  private async getAccessToken(): Promise<string> {
    const creds = teyaCredentials()
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error('Teya credentials missing')
    }
    if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
      return tokenCache.accessToken
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      scope: 'checkout/sessions/create checkout/sessions/id/get refunds/create',
    })

    const res = await fetch(oauthBase(creds.environment), {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'IcelandTaxiBooking/1.0',
      },
      body,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Teya OAuth failed (${res.status}): ${text.slice(0, 300)}`)
    }

    const json = (await res.json()) as { access_token: string; expires_in?: number }
    tokenCache = {
      accessToken: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    }
    return json.access_token
  }

  async createCheckout(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const creds = teyaCredentials()
    if (!creds.configured) {
      return {
        ok: false,
        provider: this.id,
        code: 'MISSING_CREDENTIALS',
        demoBookingAllowed: true,
        message:
          'Teya is not configured. Set TEYA_CLIENT_ID, TEYA_CLIENT_SECRET, and TEYA_STORE_ID. Booking can still be created as Awaiting Payment.',
      }
    }

    try {
      const token = await this.getAccessToken()
      const chargeAmount =
        input.depositOnly && input.depositAmount && input.depositAmount > 0
          ? input.depositAmount
          : input.amount
      const minor = toTeyaMinorUnits(chargeAmount, input.currency)
      const idempotencyKey = `itb-${input.bookingRef}-${Date.now()}`

      const payload = {
        store_id: creds.storeId,
        amount: { value: minor, currency: input.currency },
        type: 'SALE',
        success_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        merchant_reference: input.bookingRef,
        metadata: {
          booking_ref: input.bookingRef,
          booking_id: input.bookingId || '',
          description: input.description,
        },
        line_items: (input.lineItems || []).map((li) => ({
          name: li.name,
          quantity: li.quantity,
          unit_price: {
            value: toTeyaMinorUnits(li.unitAmount, input.currency),
            currency: input.currency,
          },
        })),
      }

      const res = await fetch(`${apiBase(creds.environment)}/v2/checkout/sessions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'user-agent': 'IcelandTaxiBooking/1.0',
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      })

      const text = await res.text()
      let json: Record<string, unknown> = {}
      try {
        json = text ? JSON.parse(text) : {}
      } catch {
        json = { raw: text }
      }

      if (!res.ok) {
        return {
          ok: false,
          provider: this.id,
          code: 'PROVIDER_ERROR',
          message: `Teya checkout session failed (${res.status}): ${typeof json === 'object' ? JSON.stringify(json).slice(0, 400) : text.slice(0, 400)}`,
        }
      }

      const sessionUrl = String(json.session_url || '')
      const sessionId = String(json.session_id || '')
      if (!sessionUrl || !sessionId) {
        return {
          ok: false,
          provider: this.id,
          code: 'PROVIDER_ERROR',
          message: 'Teya response missing session_url / session_id',
        }
      }

      return {
        ok: true,
        provider: this.id,
        checkoutUrl: sessionUrl,
        providerRef: sessionId,
      }
    } catch (error) {
      return {
        ok: false,
        provider: this.id,
        code: 'PROVIDER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown Teya error',
      }
    }
  }

  async getSessionStatus(providerRef: string): Promise<PaymentStatusResult> {
    const creds = teyaCredentials()
    if (!creds.configured) {
      return { ok: false, code: 'MISSING_CREDENTIALS', message: 'Teya is not configured' }
    }
    try {
      const token = await this.getAccessToken()
      const res = await fetch(
        `${apiBase(creds.environment)}/v2/checkout/sessions/${encodeURIComponent(providerRef)}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
            'user-agent': 'IcelandTaxiBooking/1.0',
          },
        },
      )
      const json = await res.json()
      if (!res.ok) {
        return {
          ok: false,
          code: 'PROVIDER_ERROR',
          message: `Teya session lookup failed (${res.status})`,
        }
      }
      return {
        ok: true,
        status: String(json.payment_status || json.session_status || 'UNKNOWN'),
        providerRef,
        raw: json,
      }
    } catch (error) {
      return {
        ok: false,
        code: 'PROVIDER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown Teya error',
      }
    }
  }
}

export const teyaProvider = new TeyaPaymentProvider()

/** Optional HMAC verification when TEYA_WEBHOOK_SECRET is set. */
export function verifyTeyaWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const secret = teyaCredentials().webhookSecret
  if (!secret) {
    return { ok: true as const, skipped: true as const }
  }
  if (!signatureHeader) {
    return { ok: false as const, reason: 'Missing signature header' }
  }
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(digest)
  const b = Buffer.from(signatureHeader.replace(/^sha256=/, ''))
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false as const, reason: 'Invalid signature' }
  }
  return { ok: true as const, skipped: false as const }
}
