'use client'
import { useCallback, useState } from 'react'
import { useLivePolling } from '@/lib/polling/use-live-polling'
import { money, type OpsBooking } from '@/lib/design/opsData'
type OverviewData = { today: string; bookings: OpsBooking[]; total: number; awaiting: number; needDriver: number; totals: {currency:'EUR'|'ISK'|'USD';amount:number}[]; drivers:{id:string;displayName:string;status:string;active:boolean}[]; threads:{ref:string;customer:string;preview:string;unread:number}[] }
export function Overview({onOpenBookings}:{onOpenBookings?:()=>void}) {
  const [data,setData]=useState<OverviewData|null>(null),[error,setError]=useState('')
  const load=useCallback(async(signal?:AbortSignal)=>{
    try {
      const response=await fetch('/api/admin/overview',{signal,cache:'no-store'}), body=await response.json()
      if(!response.ok||!body.ok)throw new Error(body.message||'Could not load overview.')
      if(!signal?.aborted){setData(body);setError('')}
    }catch(error){if(!signal?.aborted)setError(error instanceof Error?error.message:'Could not load overview.');throw error}
  },[])
  useLivePolling(load,true,30000)
  return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    {error&&<p role="alert" className="text-error">{error} <button onClick={()=>{void load().catch(()=>{})}} className="underline">Try again</button></p>}
    {!data?<p className="text-muted">{error?'Overview unavailable.':'Loading overview…'}</p>:<>
      <div className="grid gap-3 sm:grid-cols-3">{[[data.total,'Bookings'],[data.needDriver,'Confirmed bookings needing a driver'],[data.awaiting,'Awaiting payment']].map(([value,label])=><div key={label} className="rounded-xl border border-line bg-bg p-5"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-bold text-heading">{value}</p></div>)}</div>
      <section className="rounded-xl border border-line bg-bg p-5"><h2 className="text-lg font-bold text-heading">Today’s journeys · {data.today}</h2><p className="text-xs text-muted">Iceland time · refreshes automatically</p><ul className="mt-4 divide-y divide-line">{data.bookings.map(b=><li key={b.ref} className="flex flex-wrap items-center gap-3 py-3"><span className="font-bold text-heading">{b.time}</span><div className="min-w-0 flex-1"><p className="break-words text-heading">{b.route}</p><p className="text-xs text-muted">{b.ref} · {b.customer} · {b.status} · {b.driver||'No driver assigned'}</p></div><button onClick={onOpenBookings} className="text-sm text-link">Open bookings</button></li>)}{!data.bookings.length&&<li className="py-8 text-center text-muted">No journeys scheduled today.</li>}</ul></section>
      <div className="grid gap-6 lg:grid-cols-3"><section className="rounded-xl border border-line bg-bg p-5"><h2 className="font-bold text-heading">Booking values</h2><p className="mt-1 text-xs text-muted">Saved booking amounts, including unpaid trips. These are not settled revenue. Currencies are shown separately.</p>{data.totals.length?data.totals.map(t=><p key={t.currency} className="mt-3 font-semibold text-heading">{money(t.amount,t.currency)}</p>):<p className="mt-4 text-muted">No booking values yet.</p>}</section>
      <section className="rounded-xl border border-line bg-bg p-5"><h2 className="font-bold text-heading">Recent conversations</h2><ul className="mt-3 space-y-3">{data.threads.map(t=><li key={t.ref}><p className="text-sm font-semibold text-heading">{t.customer} · {t.unread} unread</p><p className="text-xs text-muted">{t.ref}</p><p className="truncate text-sm text-muted">{t.preview}</p></li>)}{!data.threads.length&&<li className="text-sm text-muted">No booking conversations yet.</li>}</ul></section>
      <section className="rounded-xl border border-line bg-bg p-5"><h2 className="font-bold text-heading">Drivers</h2><ul className="mt-3 space-y-3">{data.drivers.map(d=><li key={d.id} className="flex justify-between gap-3 text-sm"><span className="text-heading">{d.displayName}</span><span className="text-muted">{d.active?d.status:'Inactive'}</span></li>)}{!data.drivers.length&&<li className="text-sm text-muted">No drivers registered yet.</li>}</ul></section></div>
    </>}
  </div>
}
