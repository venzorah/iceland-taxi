'use client'

import { useAdminList, useListQuery } from '@/components/admin/AdminList'
import { AdminEmpty } from '@/components/admin/AdminUI'
import React, { useCallback, useEffect, useState } from 'react'
import { enquiryFollowUp, type EnquiryChannelName } from '@/lib/booking/enquiry'

type Row = {
  id: string
  name: string
  email: string
  phone: string
  channel: EnquiryChannelName
  fromLabel: string
  toLabel: string
  tripDate: string
  tripTime: string
  passengers: number
  notes: string | null
  createdAt: string
}

export function Enquiries({ compact = false, limit }: { compact?: boolean; limit?: number }) {
  const [rows, setRows] = useState<Row[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const list = useAdminList(rows, row => JSON.stringify(row), row => row.channel, [{ value: 'EMAIL', label: 'Email' }, { value: 'WHATSAPP', label: 'WhatsApp' }], 'enquiries')
  const query = useListQuery(list.query, list.filter)
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/enquiries?${query}`)
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setMsg(data.message || 'Could not load enquiries')
        setRows([])
        return
      }
      setRows(data.enquiries || [])
      setMsg(null)
    } catch {
      setMsg('Could not load enquiries')
    }
  }, [query])

  useEffect(() => {
    load()
  }, [load])

  const shown = typeof limit === 'number' ? rows.slice(0, limit) : list.visible

  return (
    <div className={compact ? 'space-y-3' : 'mx-auto max-w-5xl space-y-4 p-3 sm:p-6'}>
      <div>
        <h2 className="font-display text-lg font-bold text-heading">Custom enquiries</h2>
        <p className="text-sm text-muted">Trips that are not a published listing. Reply on the channel the customer chose.</p>
      </div>
      {!compact && <>{list.controls}{list.pagination}</>}
      {msg && <p className="text-sm text-muted">{msg}</p>}
      {shown.length === 0 && !msg && <AdminEmpty title="No custom enquiries yet" description="Custom ride requests will appear here when customers submit them." />}
      <ul className="space-y-3">
        {shown.map((row) => {
          const follow = enquiryFollowUp(row)
          const whatsapp = row.channel === 'WHATSAPP'
          return (
            <li key={row.id} className="rounded-2xl border border-line bg-bg p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${whatsapp ? 'bg-mint text-navy' : 'bg-navy text-white dark:bg-white dark:text-navy'}`}>
                  {whatsapp ? 'WhatsApp' : 'Email'}
                </span>
                <p className="font-semibold text-heading">{row.name}</p>
              </div>
              <p className="mt-2 text-sm text-heading">{row.fromLabel} → {row.toLabel}</p>
              <p className="mt-1 text-xs text-muted">{row.tripDate} · {row.tripTime} · {row.passengers} passengers</p>
              <p className="mt-1 text-xs text-muted">{row.email} · {row.phone}</p>
              {row.notes && <p className="mt-2 text-sm text-text">{row.notes}</p>}
              {follow.href && (
                <a href={follow.href} className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary">
                  {whatsapp ? 'WhatsApp customer' : 'Email customer'}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
