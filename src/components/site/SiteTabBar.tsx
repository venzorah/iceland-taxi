import React from 'react'
import { CalendarClock, Home, MessageCircle, Plus } from 'lucide-react'

import { AppTabBar } from '@/components/site/AppTabBar'

/** The customer site's bottom tab bar on phones: home, book, trips and help. */
export function SiteTabBar({ active, onHome, onBook, onTrips }: { active: 'home' | 'book' | 'trips'; onHome?: () => void; onBook?: () => void; onTrips?: () => void }) {
  return (
    <AppTabBar
      active={active}
      tabs={[
        { id: 'home', label: 'Home', icon: Home, onSelect: onHome },
        { id: 'book', label: 'Book', icon: Plus, onSelect: onBook, primary: true },
        { id: 'trips', label: 'My trips', icon: CalendarClock, onSelect: onTrips, badge: 1 },
        { id: 'help', label: 'Help', icon: MessageCircle, href: 'https://wa.me/' },
      ]}
    />
  )
}
