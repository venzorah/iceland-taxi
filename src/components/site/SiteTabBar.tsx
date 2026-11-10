import React from 'react'
import { CalendarClock, Home, MessageCircle, Plus } from 'lucide-react'

import { AppTabBar } from '@/components/site/AppTabBar'

/** The customer site's bottom tab bar on phones: home, book, trips and help/messages. */
export function SiteTabBar({
  active,
  onHome,
  onBook,
  onTrips,
  onHelp,
}: {
  active: 'home' | 'book' | 'trips' | 'help'
  onHome?: () => void
  onBook?: () => void
  onTrips?: () => void
  onHelp?: () => void
}) {
  return (
    <AppTabBar
      active={active}
      tabs={[
        { id: 'home', label: 'Home', icon: Home, onSelect: onHome },
        { id: 'book', label: 'Book', icon: Plus, onSelect: onBook, primary: true },
        { id: 'trips', label: 'My trips', icon: CalendarClock, onSelect: onTrips, badge: 1 },
        { id: 'help', label: 'Messages', icon: MessageCircle, onSelect: onHelp },
      ]}
    />
  )
}
