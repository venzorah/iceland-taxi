import type { Metadata } from 'next'
import { ManageBookingPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'Manage booking',
  description: 'Look up a trip with your booking reference and checkout email.',
}

export default function Page() {
  return <ManageBookingPageClient />
}
