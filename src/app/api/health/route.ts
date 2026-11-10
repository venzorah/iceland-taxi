import { NextResponse } from 'next/server'
import { integrationConfigured } from '@/lib/env'

export async function GET() {
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
    },
  })
}
