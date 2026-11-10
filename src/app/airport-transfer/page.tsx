import type { Metadata } from 'next'
import { AirportTransferPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'Airport transfers',
  description: 'Private Keflavík Airport transfers with flight tracking and fixed-price routes.',
}

export default function Page() {
  return <AirportTransferPageClient />
}
