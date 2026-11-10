import type { Metadata } from 'next'
import { HowItWorksPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'How it works',
  description: 'Choose a trip, confirm details, pay in USD or ISK, then track and message.',
}

export default function Page() {
  return <HowItWorksPageClient />
}
