import { Suspense } from 'react'
import { BookingPageClient } from '@/components/screens/BookingPageClient'

export const metadata = { title: 'Book your ride' }

export default function BookPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-muted">Loading booking…</div>}>
      <BookingPageClient />
    </Suspense>
  )
}
