import { NextResponse } from 'next/server'
import { applicationOrigin } from '@/lib/app-url'
export async function GET(req: Request) {
  const url = new URL(req.url)
  // Better Auth verifies its own one-time links before returning here. Old Supabase links expire.
  const legacy = url.searchParams.has('token_hash') || url.searchParams.has('code')
  const portal = url.searchParams.get('portal')
  const loginPath = portal === 'driver' ? '/driver-login' : portal === 'admin' ? '/admin-login' : '/login'
  const target = new URL(legacy || url.searchParams.has('error') ? `${loginPath}?error=confirmation` : `${loginPath}?complete=1`, applicationOrigin(req.url))
  if(url.searchParams.get('portal')==='driver'){target.searchParams.set('portal','driver');target.searchParams.set('next','/driver')}
  return NextResponse.redirect(target)
}
