import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { integrationConfigured, teyaCredentials } from '@/lib/env'
import { apiHandler, jsonOk, prisma, withDb } from '@/lib/api'

async function handleGET() {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
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
    whatsapp: {
      configured: integrationConfigured('whatsapp'),
      message: integrationConfigured('whatsapp')
        ? 'Cloud API credentials present. Outbound booking notices only. Inbound WhatsApp is not synced.'
        : 'No Cloud API credentials. Staff use a WhatsApp link after the company number is saved in System settings. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID to send.',
    },
  }

  const stored = await withDb(
    async () => prisma.integrationStatus.findMany({ orderBy: { key: 'asc' } }),
    () => [],
  )

  return jsonOk({ ok: true, live, stored })
}

export const GET = apiHandler(handleGET)
