import type { Metadata } from 'next'
import { ContactPageClient } from '@/components/screens/public/PublicPageClients'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Message Iceland Taxi Booking about a booking, quotation or partnership.',
}

export default function Page() {
  return <ContactPageClient />
}
