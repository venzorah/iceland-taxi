import type { Metadata } from 'next'
import { ServicesPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'Services',
  description: 'Airport transfers, private taxis, tours, private drivers and corporate travel.',
}

export default function Page() {
  return <ServicesPageClient />
}
