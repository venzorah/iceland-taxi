import { integrationConfigured } from '@/lib/env'
import { jsonOk, prisma, withDb } from '@/lib/api'

export async function GET() {
  const live = {
    teya: {
      configured: integrationConfigured('teya'),
      message: integrationConfigured('teya')
        ? 'Credentials present'
        : 'Set TEYA_MERCHANT_ID and TEYA_API_KEY',
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
