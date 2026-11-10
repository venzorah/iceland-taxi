import type { Metadata } from 'next'
import { BlogPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Practical travel notes for airport arrivals, tours and booking in Iceland.',
}

export default function Page() {
  return <BlogPageClient />
}
