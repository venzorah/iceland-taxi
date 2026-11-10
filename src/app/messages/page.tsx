import { MessagesPageClient } from '@/components/screens/MessagesPageClient'

export const metadata = {
  title: 'Messages · Iceland Taxi Booking',
  robots: { index: false, follow: false },
}

export default function MessagesPage() {
  return <MessagesPageClient />
}
