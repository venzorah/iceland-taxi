import type { Metadata } from 'next'
import { FleetPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'Our fleet',
  description: 'Sedan, SUV, minivan and minibus classes sized for passengers and luggage.',
}

export default function Page() {
  return <FleetPageClient />
}
