import type { Metadata } from 'next'
import { TravelGuidesPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'Travel guides',
  description: 'Longer guides for Reykjavík arrivals, Blue Lagoon timing and South Coast days.',
}

export default function Page() {
  return <TravelGuidesPageClient />
}
