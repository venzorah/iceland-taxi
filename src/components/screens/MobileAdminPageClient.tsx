'use client'

import { AdminAccessGate } from '@/components/screens/admin/AdminAccessGate'
import MobileAdmin from '@/components/screens/mobile-admin/MobileAdmin'
import { useAppPrefs } from '@/components/providers/AppProviders'

export function MobileAdminPageClient() {
  const prefs = useAppPrefs()
  return (
    <AdminAccessGate>
    <MobileAdmin
      theme={prefs.theme}
      announcements={prefs.announcements}
      onThemeChange={prefs.setTheme}
      onAnnouncementsChange={prefs.setAnnouncements}
      onOpenDesktop={() => prefs.go('/admin')}
      onViewSite={() => prefs.go('/')}
    />
    </AdminAccessGate>
  )
}
