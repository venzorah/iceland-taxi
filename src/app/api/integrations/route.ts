import { integrationConfigured, teyaCredentials } from '@/lib/env'
import { jsonOk, prisma, withDb } from '@/lib/api'

export async function GET() {
  const teya = teyaCredentials()
  const live = {
    teya: {
      configured: teya.configured && teya.sandboxOnly,
      environment: teya.environment,
      message: !teya.sandboxOnly
        ? 'TEYA_ENVIRONMENT must be sandbox. Live charges are disabled.'
        : teya.configured
          ? 'Teya sandbox credentials present. Checkout uses api.teya.xyz only.'
          : 'Set TEYA_CLIENT_ID, TEYA_CLIENT_SECRET, and TEYA_STORE_ID from the staging Business Portal',
    },
    googleMaps: {
      configured: integrationConfigured('google_maps'),
      message: integrationConfigured('google_maps')
        ? 'Credentials present'
        : 'Set GOOGLE_MAPS_API_KEY',
    },
    smtp: {
      configured: integrationConfigured('smtp'),
      message: integrationConfigured('smtp') ? 'Credentials present' : 'Set SMTP_URL',
    },
    sms: {
      configured: integrationConfigured('sms'),
      message: integrationConfigured('sms') ? 'Credentials present' : 'Set SMS_API_KEY',
    },
  }

  const stored = await withDb(
    async () => prisma.integrationStatus.findMany({ orderBy: { key: 'asc' } }),
    () => [],
  )

  return jsonOk({ ok: true, live, stored })
}
