import { z } from 'zod'

const serverSchema = z.object({
  DATABASE_URL: z.string().optional(),
  TEYA_MERCHANT_ID: z.string().optional(),
  TEYA_API_KEY: z.string().optional(),
  TEYA_ENVIRONMENT: z.enum(['sandbox', 'production']).optional().default('sandbox'),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  SMTP_URL: z.string().optional(),
  SMS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>

export function getServerEnv(): ServerEnv {
  return serverSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    TEYA_MERCHANT_ID: process.env.TEYA_MERCHANT_ID,
    TEYA_API_KEY: process.env.TEYA_API_KEY,
    TEYA_ENVIRONMENT: process.env.TEYA_ENVIRONMENT,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    SMTP_URL: process.env.SMTP_URL,
    SMS_API_KEY: process.env.SMS_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })
}

export function integrationConfigured(key: 'teya' | 'google_maps' | 'smtp' | 'sms') {
  const env = getServerEnv()
  switch (key) {
    case 'teya':
      return Boolean(env.TEYA_MERCHANT_ID && env.TEYA_API_KEY)
    case 'google_maps':
      return Boolean(env.GOOGLE_MAPS_API_KEY)
    case 'smtp':
      return Boolean(env.SMTP_URL)
    case 'sms':
      return Boolean(env.SMS_API_KEY)
  }
}
