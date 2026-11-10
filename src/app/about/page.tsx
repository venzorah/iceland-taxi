import type { Metadata } from 'next'
import { AboutPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'About us',
  description: 'Company-owned private transport booked around your Iceland trip.',
}

export default function Page() {
  return <AboutPageClient />
}
