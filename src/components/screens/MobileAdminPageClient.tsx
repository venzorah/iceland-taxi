'use client'

import MobileAdmin from '@/components/screens/mobile-admin/MobileAdmin'
import { useAppPrefs } from '@/components/providers/AppProviders'

export function MobileAdminPageClient() {
  const prefs = useAppPrefs()
  return (
    <MobileAdmin
      theme={prefs.theme}
      announcements={prefs.announcements}
      onThemeChange={prefs.setTheme}
      onAnnouncementsChange={prefs.setAnnouncements}
      onOpenDesktop={() => prefs.go('/admin')}
      onViewSite={() => prefs.go('/')}
    />
  )
}
