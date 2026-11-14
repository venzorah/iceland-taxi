import { createVerify } from 'crypto'
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

const SANDBOX_API = 'https://api.teya.xyz'
const SANDBOX_OAUTH = 'https://id.teya.xyz/oauth/v2/oauth-token'

/**
 * Teya Online Payments — Hosted Checkout, staging only.
 * Docs: https://developer.teya.com/online-payments/hosted-checkout/get-started
 *
 * Card data stays on Teya. This client never calls api.teya.com.
 * Merchant client id, secret, and store id are issued per store in the
 * staging Business Portal. Teya does not publish a shared test merchant.
 */
export class TeyaPaymentProvider implements PaymentProvider {
  readonly id = 'teya'
  readonly label = 'Teya'

  isConfigured() {
    const creds = teyaCredentials()
    return creds.configured && creds.sandboxOnly
  }

  private async getAccessToken(): Promise<string> {
    const creds = teyaCredentials()
    if (!creds.sandboxOnly) {
      throw new Error('Refusing Teya production OAuth')
    }
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

    const res = await fetch(SANDBOX_OAUTH, {
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
    if (!creds.sandboxOnly) {
      return {
        ok: false,
        provider: this.id,
        code: 'VALIDATION_ERROR',
        message:
          'Live Teya charges are disabled. Set TEYA_ENVIRONMENT=sandbox and use staging credentials from https://business.teya.xyz (Integrations).',
      }
    }
    if (!creds.configured) {
      return {
        ok: false,
        provider: this.id,
        code: 'MISSING_CREDENTIALS',
        message:
          'Teya sandbox is not configured. Set TEYA_CLIENT_ID, TEYA_CLIENT_SECRET, and TEYA_STORE_ID from the staging Business Portal. No payment was taken.',
      }
    }

    try {
      const token = await this.getAccessToken()
      const chargeAmount =
        input.depositOnly && input.depositAmount && input.depositAmount > 0
          ? input.depositAmount
          : input.amount
      const minor = toTeyaMinorUnits(chargeAmount, input.currency)
      const idempotencyKey = input.idempotencyKey || `itb-${input.bookingRef}`
      const description = input.description || 'Iceland Taxi Booking'

      const payload: Record<string, unknown> = {
        store_id: creds.storeId,
        amount: { value: minor, currency: input.currency },
        type: 'SALE',
        success_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        failure_url: input.failureUrl || input.cancelUrl,
        merchant_reference: input.bookingRef,
        post_success_payment: 'REDIRECT',
        language: 'en-GB',
        metadata: {
          booking_ref: input.bookingRef,
          booking_id: input.bookingId || '',
          description,
        },
        line_items: [
          {
            description,
            quantity: 1,
            unit_price: minor,
          },
        ],
      }

      if (input.customer?.email || input.customer?.name || input.customer?.phone) {
        payload.customer = {
          name: input.customer.name,
          email: input.customer.email,
          phone_number: input.customer.phone,
        }
      }
      if (input.customer?.email) {
        payload.customer_success_email = input.customer.email
      }

      const res = await fetch(`${SANDBOX_API}/v2/checkout/sessions`, {
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
          message: `Teya checkout session failed (${res.status}): ${JSON.stringify(json).slice(0, 400)}`,
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
      if (!sessionUrl.startsWith('https://')) {
        return {
          ok: false,
          provider: this.id,
          code: 'PROVIDER_ERROR',
          message: 'Teya response session_url was not an https URL',
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
    const looked = await this.lookupSession(providerRef)
    if (!looked.ok) return looked
    return {
      ok: true,
      status: looked.paymentStatus || looked.sessionStatus || 'UNKNOWN',
      providerRef,
      raw: looked.raw,
    }
  }

  async lookupSession(providerRef: string): Promise<TeyaSessionLookup> {
    const creds = teyaCredentials()
    if (!creds.sandboxOnly) {
      return { ok: false, code: 'VALIDATION_ERROR', message: 'Live Teya lookups are disabled' }
    }
    if (!creds.configured) {
      return { ok: false, code: 'MISSING_CREDENTIALS', message: 'Teya sandbox is not configured' }
    }
    try {
      const token = await this.getAccessToken()
      const res = await fetch(
        `${SANDBOX_API}/v2/checkout/sessions/${encodeURIComponent(providerRef)}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
            'user-agent': 'IcelandTaxiBooking/1.0',
          },
        },
      )
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        return {
          ok: false,
          code: 'PROVIDER_ERROR',
          message: `Teya session lookup failed (${res.status})`,
        }
      }
      return {
        ok: true,
        sessionId: String(json.session_id || providerRef),
        sessionStatus: String(json.session_status || 'UNKNOWN').toUpperCase(),
        paymentStatus: String(json.payment_status || 'NONE').toUpperCase(),
        transactionId: json.transaction_id ? String(json.transaction_id) : undefined,
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

export type TeyaSessionLookup =
  | {
      ok: true
      sessionId: string
      sessionStatus: string
      paymentStatus: string
      transactionId?: string
      raw: unknown
    }
  | { ok: false; code: string; message: string }

export const teyaProvider = new TeyaPaymentProvider()

/**
 * Teya signs webhook bodies with SHA256withRSA. The header is base64.
 * The public key is issued per webhook in the Business Portal.
 * A missing key is a failure: unsigned events must not mark a booking paid.
 */
export function verifyTeyaWebhookSignature(rawBody: string, signatureHeader: string | null) {
  return verifyTeyaRsaSignature(rawBody, signatureHeader, teyaCredentials().webhookPublicKey)
}

export function verifyTeyaRsaSignature(
  rawBody: string,
  signatureHeader: string | null,
  publicKeyPem: string | undefined,
) {
  if (!publicKeyPem) {
    return { ok: false as const, reason: 'TEYA_WEBHOOK_PUBLIC_KEY is not set' }
  }
  if (!signatureHeader) {
    return { ok: false as const, reason: 'Missing x-teya-signature' }
  }
  const signature = signatureHeader.replace(/^sha256=/i, '').trim()
  try {
    const verifier = createVerify('RSA-SHA256')
    verifier.update(rawBody)
    verifier.end()
    const valid = verifier.verify(publicKeyPem, signature, 'base64')
    if (!valid) return { ok: false as const, reason: 'Invalid signature' }
    return { ok: true as const }
  } catch {
    return { ok: false as const, reason: 'Could not verify signature' }
  }
}
