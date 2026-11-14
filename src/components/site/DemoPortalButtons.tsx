import Link from 'next/link'

/** Portal links share secure authentication; no demo identities are used. */
export function DemoPortalButtons({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return <div className="grid gap-2">
    {[
      { label: 'Customer sign in', href: '/account' },
      { label: 'Admin sign in', href: '/admin' },
      { label: 'Driver sign in', href: '/driver' },
    ].map(item => <Link key={item.href} href={`/login?next=${encodeURIComponent(item.href)}`} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${tone === 'dark' ? 'border-white/20 text-white' : 'border-line text-heading'}`}>{item.label}</Link>)}
  </div>
}
