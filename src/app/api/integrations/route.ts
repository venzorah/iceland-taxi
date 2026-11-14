import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { integrationConfigured, teyaCredentials } from '@/lib/env'
import { apiHandler, jsonOk, prisma, withDb } from '@/lib/api'

async function handleGET() {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  const teya = teyaCredentials()
  const live = {
    teya: {
      configured: integrationConfigured('teya'),
      environment: teya.environment,
      message: integrationConfigured('teya') ? `${teya.environment === 'production' ? 'Live' : 'Sandbox'} credentials configured. Hosted checkout and webhook delivery still require verification.` : 'Not connected. No card charges can be taken.',
    },
    googleMaps: {
      configured: integrationConfigured('google_maps'),
      message: integrationConfigured('google_maps') ? 'Configured' : 'Not configured',
    },
    smtp: {
      configured: integrationConfigured('smtp'),
      message: integrationConfigured('smtp') ? 'Configured' : 'Not configured',
    },
    sms: {
      configured: integrationConfigured('sms'),
      message: integrationConfigured('sms') ? 'Configured' : 'Not configured',
    },
    whatsapp: {
      configured: integrationConfigured('whatsapp'),
      message: integrationConfigured('whatsapp')
        ? 'Cloud API credentials present. Outbound booking notices only. Inbound WhatsApp is not synced.'
        : 'Not connected. Staff use a WhatsApp link after the company number is saved in System settings.',
    },
  }

  const stored = await withDb(
    async () => prisma.integrationStatus.findMany({ orderBy: { key: 'asc' }, select: { key: true, label: true, configured: true, updatedAt: true } }),
    () => [],
  )

  return jsonOk({ ok: true, live, stored })
}

export const GET = apiHandler(handleGET)
