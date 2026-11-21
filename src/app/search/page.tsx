import { Suspense } from 'react'
import { SearchPageClient } from '@/components/screens/SearchPageClient'
export const metadata = { title: 'Search journeys', robots: { index: false } }
export default function Page() { return <Suspense fallback={<p className="p-8">Loading search…</p>}><SearchPageClient /></Suspense> }
