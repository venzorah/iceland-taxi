'use client'

import DriverPortal from '@/components/screens/driver/DriverPortal'
import { useAppPrefs } from '@/components/providers/AppProviders'

export function DriverPageClient() {
  const prefs = useAppPrefs()
  return (
    <DriverPortal
      theme={prefs.theme}
      onThemeChange={prefs.setTheme}
      onViewSite={() => prefs.go('/')}
    />
  )
}
