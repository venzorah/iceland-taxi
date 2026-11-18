import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Database readiness only; account, SMTP and payment acceptance are separate release checks. */
export async function GET() {
  try {
    // Keep liveness independent of database initialization, including malformed connection URLs.
    const { prisma } = await import('@/lib/prisma')
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
