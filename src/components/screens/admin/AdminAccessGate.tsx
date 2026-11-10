'use client'

import React, { useEffect, useState } from 'react'

import { adminScreenAccess } from '@/lib/auth/admin-screen'

export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<'loading' | 'admin' | 'blocked'>('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetch('/api/auth/demo').then((res) => res.json())
        if (cancelled) return
        setAccess(adminScreenAccess({ staff: Boolean(data.staff), driver: Boolean(data.driver) }) === 'driver-blocked' ? 'blocked' : 'admin')
      } catch {
        if (!cancelled) setAccess('admin')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (access === 'loading') {
    return <p className="p-6 text-sm text-muted">Checking access…</p>
  }

  if (access === 'blocked') {
    return (
      <div className="grid min-h-screen place-items-center bg-surface p-6">
        <div className="max-w-md rounded-2xl border border-line bg-bg p-6 text-center">
          <h1 className="font-display text-xl font-bold text-heading">Drivers cannot open admin</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            This sign-in is the driver portal. Trips for the driver stay there. Bookings, payments, website pages and settings stay with staff.
          </p>
          <a href="/driver" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">
            Open driver portal
          </a>
        </div>
      </div>
    )
  }

  return children
}
