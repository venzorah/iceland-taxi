'use client'

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
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [msg, setMsg] = useState('Loading…')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/payments')
        const data = await res.json()
        if (!data.ok) {
          setMsg(data.message || 'Could not load payments')
          return
        }
        setRows(data.payments || [])
        setMsg(`${(data.payments || []).length} payments`)
      } catch {
        setMsg('Failed to load payments')
      }
    })()
  }, [])

  return (
    <div className="mx-auto max-w-[1200px] p-3 sm:p-6">
      <p className="text-sm text-muted">{msg} · Card numbers and payment keys stay with the payment provider. This screen shows the booking, amount, and status only.</p>
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
                  ) : p.status === 'FAILED' || p.status === 'REQUIRES_CREDENTIALS' ? (
                    <span className="text-xs text-muted">Not captured</span>
                  ) : (
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/admin/payments/${p.id}`, {
                          method: 'PATCH',
                          headers: { 'content-type': 'application/json' },
                          body: JSON.stringify({ status: 'REFUNDED' }),
                        })
                        const body = await res.json().catch(() => null)
                        if (!res.ok || !body?.ok) {
                          setMsg(body?.message || 'Could not save the refund')
                          return
                        }
                        setRows((current) => current.map((row) => (row.id === p.id ? { ...row, status: 'REFUNDED' } : row)))
                        setMsg('Refund saved')
                      }}
                      className="text-xs font-semibold text-link"
                    >
                      Mark refunded
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  No payments yet. A booking stays unpaid until the payment provider confirms it.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
