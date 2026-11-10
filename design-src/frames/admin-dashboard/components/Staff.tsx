import React from 'react'
import { Check, Minus, Plus } from 'lucide-react'

const MODULES = ['Bookings', 'Services & pricing', 'Drivers & vehicles', 'Customers', 'Payments & refunds', 'Messages', 'Announcements', 'Website & SEO', 'Reports', 'Staff', 'Appearance']
const ROLES: Record<string, string[]> = {
  'Super Admin': MODULES,
  Administrator: MODULES.filter((m) => m !== 'Staff'),
  'Booking Manager': ['Bookings', 'Customers', 'Messages'],
  'Operations Manager': ['Bookings', 'Drivers & vehicles', 'Messages', 'Reports'],
  'Finance Manager': ['Payments & refunds', 'Reports', 'Services & pricing'],
  'Content Manager': ['Announcements', 'Website & SEO', 'Appearance'],
  'Customer Support': ['Bookings', 'Customers', 'Messages'],
}

const STAFF = [
  { name: 'Demo admin', email: 'admin@demo.local', role: 'Super Admin', status: 'Active' },
  { name: 'Demo bookings', email: 'bookings@demo.local', role: 'Booking Manager', status: 'Active' },
  { name: 'Demo finance', email: 'finance@demo.local', role: 'Finance Manager', status: 'Active' },
  { name: 'Demo content', email: 'content@demo.local', role: 'Content Manager', status: 'Suspended' },
]

const AUDIT = [
  ['15:06', 'Demo admin', 'Published announcement “Northern Lights season”'],
  ['14:58', 'Demo admin', 'Changed price of KEF → Reykjavík: 21.900 → 22.900 kr'],
  ['14:41', 'Demo bookings', 'Assigned Ari Þ. to ITB-5RT7CV'],
  ['12:03', 'Demo finance', 'Refunded $434 on ITB-2ZC8RU'],
  ['09:15', 'Demo admin', 'Suspended account content@demo.local'],
]

export function Staff() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-3 sm:space-y-6 sm:p-6">
      <section className="overflow-hidden rounded-xl border border-line bg-bg">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-bold text-heading">Role permissions</h2>
          <p className="text-xs text-muted">Same rules apply on desktop and mobile</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="text-xs font-semibold text-muted">
              <tr>
                <th className="px-5 py-3 text-left">Role</th>
                {MODULES.map((m) => <th key={m} className="px-2 py-3 text-center font-semibold">{m}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {Object.entries(ROLES).map(([role, mods]) => (
                <tr key={role}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-bg px-5 py-3 font-semibold text-heading">{role}</td>
                  {MODULES.map((m) => (
                    <td key={m} className="px-2 py-3 text-center">
                      {mods.includes(m) ? <Check size={16} className="mx-auto text-mint-text" /> : <Minus size={14} className="mx-auto text-line" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-line bg-bg">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-base font-bold text-heading">Staff accounts</h2>
            <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-on-primary"><Plus size={15} /> Invite</button>
          </div>
          <ul className="divide-y divide-line">
            {STAFF.map((s) => (
              <li key={s.email} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-heading">{s.name}</p>
                  <p className="truncate text-xs text-muted">{s.email}</p>
                </div>
                <span className="text-sm text-text">{s.role}</span>
                <span className={`w-20 text-right text-xs font-semibold ${s.status === 'Active' ? 'text-success' : 'text-error'}`}>{s.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-bg">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-display text-base font-bold text-heading">Audit log · today</h2>
          </div>
          <ul className="divide-y divide-line">
            {AUDIT.map(([t, who, what]) => (
              <li key={t} className="grid grid-cols-[48px_1fr] gap-3 px-5 py-3 text-sm">
                <span className="tabular-nums text-muted">{t}</span>
                <span><strong className="font-semibold text-heading">{who}</strong> <span className="text-text">{what}</span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
