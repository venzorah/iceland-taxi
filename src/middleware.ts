import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return NextResponse.json({ message: 'Authentication is not configured' }, { status: 503 })
  const supabase = createServerClient(url, key, {
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) }) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error && (!error.status || error.status >= 500) && error.name !== 'AuthSessionMissingError') {
    return NextResponse.json({ ok: false, code: 'AUTH_UNAVAILABLE', message: 'Sign-in is temporarily unavailable. Please try again shortly.' }, { status: 503, headers: { 'Retry-After': '30' } })
  }
  const path = request.nextUrl.pathname
  const privatePage = ['/admin', '/m', '/driver', '/account', '/messages'].some(p => path === p || path.startsWith(p + '/'))
  if (privatePage && !user) {
    const target = request.nextUrl.clone()
    target.pathname = '/login'
    target.search = ''
    target.searchParams.set('next', path)
    const redirect = NextResponse.redirect(target)
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie))
    return redirect
  }
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
export const config = { matcher: ['/admin/:path*', '/m', '/driver/:path*', '/account/:path*', '/messages/:path*', '/login', '/auth/:path*'] }
