'use client'

import { AdminEmpty } from '@/components/admin/AdminUI'
import { ListSearch } from '@/components/admin/AdminList'
import React, { useEffect, useState } from 'react'

type PaymentRow = {
  id: string
  provider: string
  status: string
  amount: number
  currency: string
  createdAt: string
  booking?: { ref: string; guestName?: string | null; status?: string } | null
}

export function PaymentsList() {
  const [query, setQuery] = useState(''), [status, setStatus] = useState(''), [serverQuery, setServerQuery] = useState('')
  useEffect(() => { const timer = setTimeout(() => setServerQuery(query.trim()), 300); return () => clearTimeout(timer) }, [query])
  useEffect(() => { setPages([null]) }, [serverQuery, status])
  const [pages, setPages] = useState<(string | null)[]>([null])
  const cursor = pages[pages.length - 1]
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [msg, setMsg] = useState('Loading…')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/payments?${new URLSearchParams({ q: serverQuery, status, ...(cursor ? { cursor } : {}) })}`, { signal: controller.signal, cache: 'no-store' })
        const data = await res.json()
        if (!data.ok) {
          setMsg(data.message || 'Could not load payments')
          return
        }
        if (controller.signal.aborted) return
        setNextCursor(data.nextCursor || null)
        setRows(data.payments || [])
        setMsg(`${(data.payments || []).length} payments`)
      } catch {
        if (!controller.signal.aborted) setMsg('Failed to load payments')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    })()
    return () => controller.abort()
  }, [cursor, serverQuery, status])

  return (
    <div className="mx-auto max-w-[1200px] p-3 sm:p-6">
      <ListSearch query={query} onQuery={setQuery} filter={status} onFilter={setStatus} options={['REQUIRES_CREDENTIALS','PENDING','AUTHORIZED','CAPTURED','FAILED','REFUNDED'].map(value => ({ value, label: value.replaceAll('_',' ') }))} label="payments" />
      <p className="mt-4 text-sm text-muted">{msg} · Card numbers and payment keys stay with the payment provider. This screen shows the booking, amount, and status only.</p>
      <div className="mt-3 flex items-center gap-3"><button disabled={loading || pages.length === 1} onClick={() => setPages(p => p.slice(0, -1))} className="rounded-xl border border-line px-4 py-2 disabled:opacity-40">Previous</button><span className="text-sm text-muted">Page {pages.length}</span><button disabled={loading || !nextCursor} onClick={() => setPages(p => [...p, nextCursor])} className="rounded-xl border border-line px-4 py-2 disabled:opacity-40">Next</button></div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-bg">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs font-semibold text-muted">
            <tr>
              {['Created', 'Booking', 'Provider', 'Amount', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 tabular-nums text-muted">{new Date(p.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs text-heading">{p.booking?.ref || '—'}</p>
                  <p className="text-xs text-muted">{p.booking?.guestName || ''}</p>
                </td>
                <td className="px-4 py-3 text-text">{p.provider}</td>
                <td className="px-4 py-3 font-semibold tabular-nums text-heading">
                  {p.currency === 'EUR'
                    ? `€${p.amount.toLocaleString('en-US').replace(/,/g, '.')}`
                    : p.currency === 'ISK'
                      ? `ISK ${p.amount.toLocaleString('en-US')}`
                      : `$${p.amount.toLocaleString('en-US')}`}
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-heading">{p.status}</td>
                <td className="px-4 py-3 text-right">
                  {p.status === 'REFUNDED' ? (
                    <span className="text-xs font-semibold text-muted">Refunded</span>
                  ) : (
                    <span className="text-xs text-muted">{p.status === 'CAPTURED' ? 'Refund review — processing pending' : 'Not captured'}</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && msg === '0 payments' && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  <AdminEmpty title="No payments yet" description="Payment records appear here after checkout. A booking stays unpaid until the payment provider confirms it." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
