import type { Metadata } from 'next'
import { PrivateToursPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'Private tours',
  description: 'Private Golden Circle, South Coast and Northern Lights sightseeing tours.',
}

export default function Page() {
  return <PrivateToursPageClient />
}
