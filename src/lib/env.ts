import { z } from 'zod'

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v)

const serverSchema = z.object({
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  // Teya Online Payments (OAuth client credentials + store)
  TEYA_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  TEYA_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  TEYA_STORE_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  TEYA_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  /** PEM public key from the staging Business Portal webhook. Verifies x-teya-signature (RSA). */
  TEYA_WEBHOOK_PUBLIC_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  TEYA_ENVIRONMENT: z.enum(['sandbox', 'production']).optional().default('sandbox'),
  // Legacy aliases (scaffold) — treated as client id / secret when modern vars unset
  TEYA_MERCHANT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  TEYA_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  GOOGLE_MAPS_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  SMS_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  NEXT_PUBLIC_APP_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYMENT_PROVIDER: z.preprocess(emptyToUndefined, z.string().optional()),
  /// Web Push (optional). Public key is safe to expose. Private key stays on the server.
  VAPID_PUBLIC_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  VAPID_PRIVATE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  /// mailto: or https: contact for the push service. Do not invent a company address.
  VAPID_SUBJECT: z.preprocess(emptyToUndefined, z.string().optional()),
})

export type ServerEnv = z.infer<typeof serverSchema>

export function getServerEnv(): ServerEnv {
  return serverSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    TEYA_CLIENT_ID: process.env.TEYA_CLIENT_ID,
    TEYA_CLIENT_SECRET: process.env.TEYA_CLIENT_SECRET,
    TEYA_STORE_ID: process.env.TEYA_STORE_ID,
    TEYA_WEBHOOK_SECRET: process.env.TEYA_WEBHOOK_SECRET,
    TEYA_WEBHOOK_PUBLIC_KEY: process.env.TEYA_WEBHOOK_PUBLIC_KEY,
    TEYA_ENVIRONMENT: process.env.TEYA_ENVIRONMENT,
    TEYA_MERCHANT_ID: process.env.TEYA_MERCHANT_ID,
    TEYA_API_KEY: process.env.TEYA_API_KEY,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    SMTP_URL: process.env.SMTP_URL,
    SMS_API_KEY: process.env.SMS_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  })
}

function normalizePem(value: string | undefined) {
  if (!value) return undefined
  const pem = value.includes('\\n') ? value.replace(/\\n/g, '\n') : value
  return pem.trim()
}

export function teyaCredentials() {
  const env = getServerEnv()
  const clientId = env.TEYA_CLIENT_ID || env.TEYA_MERCHANT_ID
  const clientSecret = env.TEYA_CLIENT_SECRET || env.TEYA_API_KEY
  const storeId = env.TEYA_STORE_ID
  const environment = env.TEYA_ENVIRONMENT ?? 'sandbox'
  return {
    clientId,
    clientSecret,
    storeId,
    environment,
    /** Live hosts are refused. Checkout only calls api.teya.xyz. */
    sandboxOnly: environment === 'sandbox',
    webhookSecret: env.TEYA_WEBHOOK_SECRET,
    webhookPublicKey: normalizePem(env.TEYA_WEBHOOK_PUBLIC_KEY),
    configured: Boolean(clientId && clientSecret && storeId),
  }
}

export function integrationConfigured(key: 'teya' | 'google_maps' | 'smtp' | 'sms') {
  const env = getServerEnv()
  switch (key) {
    case 'teya': {
      const teya = teyaCredentials()
      return teya.configured && teya.sandboxOnly
    }
    case 'google_maps':
      return Boolean(env.GOOGLE_MAPS_API_KEY)
    case 'smtp':
      return Boolean(env.SMTP_URL)
    case 'sms':
      return Boolean(env.SMS_API_KEY)
  }
}
