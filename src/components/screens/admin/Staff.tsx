'use client'
import { useNoticeToast } from '@/components/feedback/FormFeedback'

import { AdminButton, AdminForm, AdminModal, AdminNotice, AdminToggle, AdminEmpty } from '@/components/admin/AdminUI'
import React, { useCallback, useEffect, useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'

const MODULES = ['Bookings', 'Services & pricing', 'Drivers & vehicles', 'Customers', 'Payments & refunds', 'Messages', 'Announcements', 'Website & SEO', 'Reports', 'Staff', 'Appearance']
const ROLES: Record<string, string[]> = {
  'Super Admin': MODULES,
  'Booking Manager': ['Bookings', 'Customers', 'Messages'],
  'Finance Manager': ['Payments & refunds', 'Reports', 'Services & pricing'],
  'Content Manager': ['Announcements', 'Website & SEO', 'Appearance'],
  Staff: ['Bookings', 'Customers', 'Messages'],
}

const ROLE_OPTIONS = [
  ['SUPER_ADMIN', 'Super Admin'],
  ['BOOKING_MANAGER', 'Booking Manager'],
  ['FINANCE_MANAGER', 'Finance Manager'],
  ['CONTENT_MANAGER', 'Content Manager'],
  ['STAFF', 'Staff'],
] as const

type StaffRow = { id: string; name: string; email: string; role: string; roleLabel: string; active: boolean }

const inputClass = 'mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus'

export function Staff() {
  const [rows, setRows] = useState<StaffRow[]>([])
  const [msg, setMsg] = useState('Loading…')
  useNoticeToast(msg)
  const [updating, setUpdating] = useState(false)
  const [invite, setInvite] = useState(false)
  const [draft, setDraft] = useState({ name: '', email: '', role: 'STAFF' })

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/staff')
    const data = await res.json().catch(() => null)
    if (!data?.ok) {
      setMsg(data?.message || 'Could not load staff')
      return
    }
    setRows(data.staff || [])
    setMsg('')
  }, [])

  useEffect(() => {
    void load().catch(() => setMsg('Could not load this section. Please try again.'))
  }, [load])

  const saveInvite = async () => {
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(draft),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      setMsg(data?.message || 'Could not add the staff account')
      return
    }
    setInvite(false)
    setDraft({ name: '', email: '', role: 'STAFF' })
    await load()
    setMsg('Staff account saved.')
  }

  const update = async (row: StaffRow, patch: { role?: string; active?: boolean }) => {
    if (updating) return
    setUpdating(true)
    try {
    const res = await fetch(`/api/admin/staff/${row.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      setMsg(data?.message || 'Could not update the staff account')
      return
    }
    await load()
    setMsg('Staff account saved.')
    } catch { setMsg('Could not update this staff account. Please try again.') } finally { setUpdating(false) }
  }

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
                {MODULES.map((module) => <th key={module} className="px-2 py-3 text-center font-semibold">{module}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {Object.entries(ROLES).map(([role, mods]) => (
                <tr key={role}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-bg px-5 py-3 font-semibold text-heading">{role}</td>
                  {MODULES.map((module) => (
                    <td key={module} className="px-2 py-3 text-center">
                      {mods.includes(module) ? <Check size={16} className="mx-auto text-mint-text" /> : <Minus size={14} className="mx-auto text-line" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-bg">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-base font-bold text-heading">Staff accounts</h2>
            <p className="text-xs text-muted">{msg}</p>
          </div>
          <AdminButton onClick={() => setInvite((value) => !value)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-on-primary"><Plus size={15} /> Invite</AdminButton>
        </div>
        {invite && (
          <AdminModal title="Add staff account" onClose={() => setInvite(false)}><AdminNotice message={msg} /><AdminForm
            onSubmit={(event) => {
              event.preventDefault()
              return saveInvite()
            }}
            className="grid gap-3 border-b border-line px-5 py-4 sm:grid-cols-4"
          >
            <label className="text-xs font-semibold text-muted">Name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></label>
            <label className="text-xs font-semibold text-muted">Email<input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={inputClass} /></label>
            <label className="text-xs font-semibold text-muted">Role
              <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className={inputClass}>
                {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div className="flex items-end"><AdminButton type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">Save account</AdminButton></div>
          </AdminForm></AdminModal>
        )}
        {!rows.length && !msg.includes('Loading') && <AdminEmpty title="No staff accounts to show" description="Add a verified staff member to manage access to the admin dashboard." />}
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-heading">{row.name}</p>
                <p className="truncate text-xs text-muted">{row.email}</p>
              </div>
              <select disabled={updating} aria-label={`Role for ${row.email}`} value={row.role} onChange={(event) => update(row, { role: event.target.value })} className="rounded-lg border border-input-line bg-input px-2 py-1.5 text-sm text-heading">
                {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <AdminToggle disabled={updating} label={row.active ? 'Active' : 'Suspended'} checked={row.active} onChange={active => update(row, { active })} />
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-5 py-3 text-xs leading-relaxed text-muted">Role changes are saved on the staff account. Drivers are not listed here and cannot open these screens.</p>
      </section>
    </div>
  )
}
