import { apiHandler } from '@/lib/api'
import { NextResponse } from 'next/server'
import { integrationConfigured } from '@/lib/env'

async function handleGET() {
  return NextResponse.json({
    ok: true,
    service: 'iceland-taxi',
    time: new Date().toISOString(),
    integrations: {
      database: Boolean(process.env.DATABASE_URL),
      teya: integrationConfigured('teya'),
      googleMaps: integrationConfigured('google_maps'),
      smtp: integrationConfigured('smtp'),
      sms: integrationConfigured('sms'),
      whatsappCloud: integrationConfigured('whatsapp'),
    },
  })
}

export const GET = apiHandler(handleGET)
