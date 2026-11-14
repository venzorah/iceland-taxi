'use client'
import Link from 'next/link'
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-lg px-5 py-20 text-center"><h1 className="text-2xl font-bold text-heading">We couldn’t load this page</h1><p className="mt-3 text-muted">Please try again shortly. If you were making a payment, check your trips before starting another checkout.</p><div className="mt-6 flex justify-center gap-3"><button onClick={reset} className="rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary">Try again</button><Link href="/account" className="rounded-xl border border-line px-5 py-3 text-heading">My trips</Link><Link href="/" className="rounded-xl border border-line px-5 py-3 text-heading">Home</Link></div></main>
}
