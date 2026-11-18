import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

async function handleGET() {
  return NextResponse.json({
    ok: true,
    service: 'iceland-taxi',
    time: new Date().toISOString(),

  }, { headers: { 'Cache-Control': 'no-store' } })
}

// Liveness must remain independent of database/native-client initialization.
export const GET = handleGET
