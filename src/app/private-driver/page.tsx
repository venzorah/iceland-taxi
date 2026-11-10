import type { Metadata } from 'next'
import { PrivateDriverPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'Private driver',
  description: 'Hourly to multi-day private chauffeur hire across Iceland.',
}

export default function Page() {
  return <PrivateDriverPageClient />
}
