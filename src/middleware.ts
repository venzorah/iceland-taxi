import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const loginPath = path === '/admin' || path.startsWith('/admin/') || path === '/m' ? '/admin-login' : path === '/driver' || path.startsWith('/driver/') ? '/driver-login' : '/login'
  const privatePage = ['/admin','/m','/driver','/account','/messages'].some(p => path === p || path.startsWith(p + '/'))
  // This is a navigation hint only. Every protected server/API operation verifies the DB session.
  if (privatePage && !getSessionCookie(request, { cookiePrefix: 'iceland-taxi' })) {
    const target = request.nextUrl.clone();target.pathname=loginPath;target.search=''
    target.searchParams.set('next',path)
    return NextResponse.redirect(target)
  }
  const response=NextResponse.next()
  response.headers.set('Cache-Control','private, no-store')
  return response
}
export const config = { matcher: ['/admin/:path*','/m','/driver/:path*','/account/:path*','/messages/:path*','/login','/signup','/driver-login','/driver-signup','/admin-login','/auth/:path*'] }
