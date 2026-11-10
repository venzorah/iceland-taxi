import type { Metadata } from 'next'
import { FaqsPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'FAQs',
  description: 'Answers about booking, currency, flight delays, multi-day drivers and cancellations.',
}

export default function Page() {
  return <FaqsPageClient />
}
