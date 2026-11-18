import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { LoginForm } from './LoginForm'
export const metadata = { title: 'Customer sign in', robots: { index: false } }
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const next = typeof params.next === 'string' ? params.next : ''
  const portal = params.portal
  const route = portal === 'driver' || next === '/driver' || next.startsWith('/driver/') ? '/driver-login' : portal === 'admin' || next === '/admin' || next.startsWith('/admin/') || next === '/m' ? '/admin-login' : null
  if (route) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) if (typeof value === 'string' && key !== 'portal') query.set(key, value)
    redirect(`${route}?${query}`)
  }
  return <Suspense fallback={<p className="p-8">Loading…</p>}><LoginForm /></Suspense>
}
