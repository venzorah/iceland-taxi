import { integrationConfigured, teyaCredentials } from '@/lib/env'
import { jsonOk, prisma, withDb } from '@/lib/api'

export async function GET() {
  const teya = teyaCredentials()
  const live = {
    teya: {
      configured: teya.configured && teya.sandboxOnly,
      environment: teya.environment,
      message: !teya.sandboxOnly
        ? 'Live charges are disabled.'
        : teya.configured
          ? 'Connected. Card details stay with the payment provider.'
          : 'Not connected. No card charges can be taken.',
    },
    googleMaps: {
      configured: integrationConfigured('google_maps'),
      message: integrationConfigured('google_maps') ? 'Connected' : 'Not connected',
    },
    smtp: {
      configured: integrationConfigured('smtp'),
      message: integrationConfigured('smtp') ? 'Connected' : 'Not connected',
    },
    sms: {
      configured: integrationConfigured('sms'),
      message: integrationConfigured('sms') ? 'Connected' : 'Not connected',
    },
    whatsapp: {
      configured: integrationConfigured('whatsapp'),
      message: integrationConfigured('whatsapp')
        ? 'Cloud API credentials present. Outbound booking notices only. Inbound WhatsApp is not synced.'
        : 'Not connected. Staff use a WhatsApp link after the company number is saved in System settings.',
    },
  }

  const stored = await withDb(
    async () => prisma.integrationStatus.findMany({ orderBy: { key: 'asc' } }),
    () => [],
  )

  return jsonOk({ ok: true, live, stored })
}
