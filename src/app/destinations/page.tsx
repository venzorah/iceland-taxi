import type { Metadata } from 'next'
import { DestinationsPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'Destinations',
  description: 'Popular Iceland destinations for transfers, tours and private-driver days.',
}

export default function Page() {
  return <DestinationsPageClient />
}
