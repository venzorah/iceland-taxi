'use client'

import { useState } from 'react'

import AdminDashboard from '@/components/screens/admin/AdminDashboard'
import { useAppPrefs } from '@/components/providers/AppProviders'

export function AdminPageClient() {
  const prefs = useAppPrefs()
  const [section, setSection] = useState('overview')

  return (
    <AdminDashboard
      theme={prefs.theme}
      section={section}
      announcements={prefs.announcements}
      onThemeChange={prefs.setTheme}
      onSectionChange={setSection}
      onAnnouncementsChange={prefs.setAnnouncements}
      onViewSite={() => prefs.go('/')}
    />
  )
}
