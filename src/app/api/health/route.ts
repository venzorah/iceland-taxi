import { apiHandler } from '@/lib/api'
import { NextResponse } from 'next/server'

async function handleGET() {
  return NextResponse.json({
    ok: true,
    service: 'iceland-taxi',
    time: new Date().toISOString(),

  })
}

export const GET = apiHandler(handleGET)
