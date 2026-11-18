'use client'
import Link from 'next/link'
export function PublishedListingsNotice({ error, onRetry }: { error: string; onRetry: () => void }) {
  if (!error) return null
  return <div role="alert" className="mx-auto my-4 max-w-7xl rounded-2xl border border-line bg-surface p-4 text-sm text-heading"><p>{error}</p><div className="mt-2 flex gap-4"><button type="button" onClick={onRetry} className="min-h-10 font-semibold text-link underline">Retry prices</button><Link href="/contact" className="inline-flex min-h-10 items-center font-semibold text-link underline">Contact our team</Link></div></div>
}
