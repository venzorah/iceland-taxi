'use client'

import React from 'react'
import {
  BarChart3, Bus, Megaphone, CalendarCheck, Car, CreditCard, ExternalLink, FileText, Globe, Inbox, LayoutDashboard, MapPinned, MessageSquare,
  Palette, Route, Search, Settings, Shield, Star, Tag, Users, UserSquare2,
} from 'lucide-react'

import { LOGO_DARK } from '@/lib/design/data'

const GROUPS = [
  { title: 'Operations', items: [['overview', 'Overview', LayoutDashboard], ['bookings', 'Bookings', CalendarCheck], ['enquiries', 'Enquiries', Inbox], ['messages', 'Messages', MessageSquare], ['drivers', 'Drivers', UserSquare2], ['vehicles', 'Vehicles', Car]] },
  { title: 'Catalogue', items: [['services', 'Services', Bus], ['routes', 'Routes', Route], ['pricing', 'Pricing', Tag], ['destinations', 'Destinations', MapPinned]] },
  { title: 'Business', items: [['customers', 'Customers', Users], ['payments', 'Payments & refunds', CreditCard], ['reports', 'Reports', BarChart3], ['reviews', 'Reviews', Star]] },
  { title: 'Website', items: [['announcements', 'Announcements', Megaphone], ['pages', 'Pages & blog', FileText], ['seo', 'SEO & landing pages', Search], ['languages', 'Languages', Globe]] },
  { title: 'System', items: [['staff', 'Staff & permissions', Shield], ['appearance', 'Appearance & theme', Palette], ['settings', 'System settings', Settings]] },
] as const

const ACCESS: Record<string, string[] | 'all'> = {
  'Super Admin': 'all',
  'Booking Manager': ['overview', 'bookings', 'enquiries', 'messages', 'customers'],
  'Finance Manager': ['overview', 'payments', 'reports', 'pricing'],
  'Content Manager': ['announcements', 'pages', 'seo', 'languages', 'destinations', 'reviews', 'appearance'],
}

/** The same sections as the sidebar, as a tappable list for the phone and tablet menu sheet. */
export function MobileNav({ active, role, onSelect, onViewSite }: { active: string; role: string; onSelect: (s: string) => void; onViewSite?: () => void }) {
  const allowed = ACCESS[role] ?? 'all'
  return (
    <div>
      <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-sm font-bold text-navy">SA</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-heading">Juliet</p>
          <p className="truncate text-xs text-muted">admin@example.local · {role}</p>
        </div>
        <button onClick={onViewSite} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-link">
          <ExternalLink size={13} /> Public site
        </button>
      </div>
      {GROUPS.map((g) => {
        const items = g.items.filter(([id]) => allowed === 'all' || allowed.includes(id))
        if (!items.length) return null
        return (
          <div key={g.title} className="mt-5">
            <p className="pb-1 text-xs font-semibold text-muted">{g.title}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-2">
              {items.map(([id, label, Icon]) => {
                const on = active === id
                return (
                  <button
                    key={id}
                    onClick={() => onSelect(id)}
                    className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] transition-colors duration-150 ${on ? 'bg-surface font-semibold text-heading' : 'text-text active:bg-surface'}`}
                  >
                    <Icon size={18} className={on ? 'text-heading' : 'text-muted'} />
                    <span className="truncate">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Sidebar({ active, role, onSelect, onViewSite }: { active: string; role: string; onSelect: (s: string) => void; onViewSite?: () => void }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-navy text-white lg:flex">
      <div className="flex h-20 items-center border-b border-white/10 px-4">
        <img src={LOGO_DARK} alt="Iceland Taxi Booking" className="h-16 w-auto" />
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {GROUPS.map((g) => {
          const allowed = ACCESS[role] ?? 'all'
          const items = g.items.filter(([id]) => allowed === 'all' || allowed.includes(id))
          if (!items.length) return null
          return (
          <div key={g.title} className="mb-5">
            <p className="px-3 pb-1.5 text-[11px] font-semibold text-white/45">{g.title}</p>
            {items.map(([id, label, Icon]) => {
              const on = active === id
              return (
                <button
                  key={id}
                  onClick={() => onSelect(id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 ${on ? 'bg-white/10 font-semibold text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                >
                  <Icon size={16} className={on ? 'text-primary' : ''} />
                  <span className="truncate">{label}</span>
                </button>
              )
            })}
          </div>
          )
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-mint text-sm font-bold text-navy">SA</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Juliet</p>
            <p className="truncate text-xs text-white/60">admin@example.local · {role}</p>
          </div>
        </div>
        <button onClick={onViewSite} className="mt-3 flex items-center gap-1.5 text-xs font-medium text-cyan hover:underline">
          <ExternalLink size={13} /> View public website
        </button>
      </div>
    </aside>
  )
}
