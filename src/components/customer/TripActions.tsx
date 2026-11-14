'use client'
import { useState } from 'react'
import Link from 'next/link'
export function TripActions({ trip, onUpdated }: { trip: { ref: string; status: string; paid: boolean; hasReceipt: boolean }; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  async function cancel(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    try { const response = await fetch(`/api/account/bookings/${encodeURIComponent(trip.ref)}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setMessage(data.message); setOpen(false); onUpdated() } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save your request.') } finally { setBusy(false) }
  }
  async function pay() {
    setBusy(true); setMessage('')
    try { const response = await fetch('/api/payments/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingRef: trip.ref }) }); const data = await response.json(); if (!response.ok || !data.checkoutUrl) throw new Error(data.message || 'Could not start payment.'); window.location.assign(data.checkoutUrl) } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not start payment.'); setBusy(false) }
  }
  return <div className="mt-4 border-t border-line pt-4"><div className="flex flex-wrap gap-3 text-sm font-semibold">
    {['PENDING', 'AWAITING_PAYMENT'].includes(trip.status) && !trip.paid && <button disabled={busy} onClick={pay} className="rounded-xl bg-primary px-4 py-2 text-on-primary disabled:opacity-50">Pay for booking</button>}
    {trip.hasReceipt && <a href={`/api/account/bookings/${encodeURIComponent(trip.ref)}/receipt`} className="rounded-xl border border-line px-4 py-2 text-heading">Download receipt</a>}
    {['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'DRIVER_ASSIGNED', 'ACKNOWLEDGED'].includes(trip.status) && <button disabled={busy} onClick={() => setOpen(!open)} className="rounded-xl border border-line px-4 py-2 text-heading">{trip.paid ? 'Request cancellation / refund' : 'Cancel booking'}</button>}
    <Link href={`/messages?ref=${encodeURIComponent(trip.ref)}`} className="rounded-xl border border-line px-4 py-2 text-heading">Contact our team</Link>
  </div>{open && <form onSubmit={cancel} className="mt-3 space-y-2"><p className="text-sm text-muted">{trip.paid ? 'Your request will be reviewed. This does not automatically issue a refund.' : 'This cancels your unstarted, unpaid booking.'}</p><textarea aria-label="Cancellation reason" required minLength={1} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} className="w-full rounded-xl border border-line bg-input p-3 text-heading" placeholder="Reason for cancellation" /><button disabled={busy} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{busy ? 'Saving…' : 'Confirm request'}</button></form>}{message && <p role="status" className="mt-3 text-sm text-heading">{message}</p>}</div>
}
