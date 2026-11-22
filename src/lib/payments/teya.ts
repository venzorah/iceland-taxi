import { diagnosticId, timed, timingMarker } from './timing'
import { configuredAppUrl } from '@/lib/app-url'
import { createHash, createVerify } from 'crypto'
import { teyaCredentials } from '@/lib/env'
import { toTeyaMinorUnits } from '@/lib/booking/pricing'
import { checkoutRejectionDiagnostic } from './teya-diagnostics'
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatusResult,
} from './types'

type TokenCache = { context: string; accessToken: string; expiresAt: number }

let tokenCache: TokenCache | null = null
const tokenRequests = new Map<string, Promise<string>>()

/** Only fixed, locally composed diagnostics; never wrap a provider body or access token. */
class TeyaCheckoutError extends Error {}

/** Preserve useful transport codes without logging exception messages or request headers. */
function safeTransportCode(error: unknown) {
  const allowed = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EHOSTUNREACH', 'ETIMEDOUT', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'ERR_TLS_CERT_ALTNAME_INVALID', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET'])
  const pending: unknown[] = [error]
  for (let i = 0; i < pending.length && i < 12; i++) {
    const current = pending[i]
    if (!current || typeof current !== 'object') continue
    const detail = current as { code?: unknown; cause?: unknown; errors?: unknown; message?: unknown }
    if (typeof detail.code === 'string' && allowed.has(detail.code)) return detail.code
    if (detail.message === 'unexpected redirect') return 'HTTP_REDIRECT_BLOCKED'
    if (detail.cause) pending.push(detail.cause)
    if (Array.isArray(detail.errors)) pending.push(...detail.errors.slice(0, 4))
  }
  return undefined
}

/** Hosted checkout uses fixed official hosts selected by TEYA_ENVIRONMENT.
 * Production credentials and token caches must never cross into the sandbox.
 * https://docs.teya.com/online-payments/hosted-checkout/get-started
 */
function liveReturnUrlsValid(input: CreatePaymentInput) {
  try {
    const app = new URL(configuredAppUrl() || '')
    if(app.protocol !== 'https:' || app.username || app.password || ['localhost','127.0.0.1','[::1]'].includes(app.hostname)) return false
    return [input.returnUrl,input.cancelUrl,input.failureUrl || input.cancelUrl].every(value=>{
      const url=new URL(value)
      return url.origin===app.origin && !url.username && !url.password
    })
  } catch { return false }
}
/** Untagged historical sessions are sandbox-only; never reuse them as live payments. */
export function paymentEnvironmentMatches(raw: unknown, environment = teyaCredentials().environment) {
  const stored = raw && typeof raw === 'object' && 'environment' in raw ? raw.environment : undefined
  return stored === environment || (stored === undefined && environment === 'sandbox')
}
/** Keep environment metadata when a failed/cancelled lookup replaces the provider snapshot. */
export function teyaSessionSnapshot(previous: unknown, session: unknown) {
  return { ...(previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {}), session }
}
export class TeyaPaymentProvider implements PaymentProvider {
  readonly id = 'teya'
  readonly label = 'Teya'

  isConfigured() {
    const creds = teyaCredentials()
    return creds.configured && (creds.environment !== 'production' || Boolean(creds.webhookPublicKey))
  }

  private async getAccessToken(): Promise<string> {
    const creds = teyaCredentials()
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error('Teya credentials missing')
    }
    const context = createHash('sha256').update(JSON.stringify([creds.environment,creds.clientId,creds.clientSecret,creds.storeId])).digest('hex')
    if (tokenCache?.context === context && tokenCache.expiresAt > Date.now() + 30_000) {
      timingMarker('oauth_cache_hit')
      return tokenCache.accessToken
    }

    const existing = tokenRequests.get(context)
    if (existing) return timed('oauth_wait', () => existing)
    const request = (async () => {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: creds.clientId!,
      client_secret: creds.clientSecret!,
      scope: 'checkout/sessions/create checkout/sessions/id/get refunds/create',
    })

    const res = await fetch(creds.oauthUrl, {
      redirect: 'error', signal: AbortSignal.timeout(15000),
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'IcelandTaxiBooking/1.0',
      },
      body,
    })

    if (!res.ok) {
      throw new TeyaCheckoutError(`Teya authentication failed (HTTP ${res.status}; ${creds.environment}). Check the selected environment and merchant credentials.`)
    }

    const json = (await res.json()) as { access_token: string; expires_in?: number }
    if (!json.access_token || typeof json.access_token !== 'string') throw new TeyaCheckoutError(`Teya authentication response has no access token (${creds.environment}).`)
    tokenCache = {
      context,
      accessToken: json.access_token,
      expiresAt: Date.now() + (typeof json.expires_in === 'number' && Number.isFinite(json.expires_in) ? Math.max(0, Math.min(json.expires_in, 3600)) : 300) * 1000,
    }
    return json.access_token
    })()
    tokenRequests.set(context, request)
    try { return await timed('oauth', () => request) } finally { if (tokenRequests.get(context) === request) tokenRequests.delete(context) }
  }

  async createCheckout(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const creds = teyaCredentials()
    if (creds.environment === 'production' && (!creds.webhookPublicKey || !liveReturnUrlsValid(input))) {
      return { ok: false, provider: this.id, code: 'VALIDATION_ERROR', message: 'Live checkout requires a webhook public key and HTTPS return URLs on the configured website origin. No payment was taken.' }
    }
    if (!creds.configured) {
      return {
        ok: false,
        provider: this.id,
        code: 'MISSING_CREDENTIALS',
        message:
          'Teya is not configured. Set merchant credentials for the selected environment. No payment was taken.',
      }
    }

    let stage = 'authentication'
    try {
      const token = await this.getAccessToken()
      stage = 'checkout session'
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
          // Teya permits at most 500 characters per metadata value.
          description: Array.from(description).slice(0, 500).join(''),
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
        // Phone is optional in Teya's schema, but if supplied must be E.164.
        // Preserve the original booking contact; only normalize the checkout prefill.
        const phone = input.customer.phone?.trim().replace(/[\s().-]/g, '')
        payload.customer = {
          name: input.customer.name,
          email: input.customer.email,
          phone_number: phone && /^\+[1-9]\d{1,14}$/.test(phone) ? phone : undefined,
        }
      }
      if (input.customer?.email) {
        payload.customer_success_email = input.customer.email
      }

      const res = await timed('teya_headers', () => fetch(`${creds.apiUrl}/v2/checkout/sessions`, {
        method: 'POST',
        redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'user-agent': 'IcelandTaxiBooking/1.0',
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      }))

      const json: unknown = await timed('teya_body', async () => {
        const text = await res.text()
        try { return text ? JSON.parse(text) : {} }
        catch { return {} } // Never retain or log an unstructured provider error body.
      })

      if (!res.ok) {
        if (res.status === 401 && tokenCache?.accessToken === token) tokenCache = null
        console.warn('[teya.checkout.rejected]', JSON.stringify({ diagnosticId: diagnosticId(), ...checkoutRejectionDiagnostic(res, json, creds.environment, [
          token, creds.clientId || '', creds.clientSecret || '', creds.storeId || '',
          creds.webhookPublicKey || '', creds.webhookSecret || '',
          input.customer?.email || '', input.customer?.name || '', input.customer?.phone || '',
          input.bookingRef, input.bookingId || '', input.idempotencyKey || '', description,
          input.returnUrl, input.cancelUrl, input.failureUrl || '',
        ]) }))
        return {
          ok: false,
          provider: this.id,
          code: 'PROVIDER_ERROR',
          message: `Teya could not create checkout (HTTP ${res.status}; ${creds.environment}). Please contact support if this continues.`,
        }
      }

      const session = json && typeof json === 'object' ? json as Record<string, unknown> : {}
      const sessionUrl = typeof session.session_url === 'string' ? session.session_url : ''
      const sessionId = typeof session.session_id === 'string' ? session.session_id : ''
      if (!sessionUrl || !sessionId) {
        return {
          ok: false,
          provider: this.id,
          code: 'PROVIDER_ERROR',
          message: 'Teya response missing session_url / session_id',
        }
      }
      let safeSessionUrl = false
      try { const url = new URL(sessionUrl); safeSessionUrl = url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && (creds.environment !== 'production' || url.hostname === 'checkout.teya.com') } catch { /* Reject malformed provider responses. */ }
      if (!safeSessionUrl) {
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
      const timedOut = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
      const transportCode = safeTransportCode(error)
      return {
        ok: false,
        provider: this.id,
        code: 'PROVIDER_ERROR',
        message: error instanceof TeyaCheckoutError ? error.message : `Teya ${stage} request ${timedOut ? 'timed out' : 'failed before a usable response'} (${creds.environment}${transportCode ? `; ${transportCode}` : ''}). Check VPS connectivity and Teya availability; retry the saved booking.`,
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
    if (!creds.configured) {
      return { ok: false, code: 'MISSING_CREDENTIALS', message: 'Teya is not configured' }
    }
    try {
      const token = await this.getAccessToken()
      const res = await fetch(
        `${creds.apiUrl}/v2/checkout/sessions/${encodeURIComponent(providerRef)}`,
        {
          redirect: 'error', signal: AbortSignal.timeout(15000),
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
    } catch {
      return {
        ok: false,
        code: 'PROVIDER_ERROR',
        message: 'Teya is temporarily unavailable. Retry your saved booking shortly; do not start another booking.',
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
