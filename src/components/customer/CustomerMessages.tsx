'use client'
import { useNoticeToast } from '@/components/feedback/FormFeedback'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLivePolling } from '@/lib/polling/use-live-polling'
import { MessageCircle, Send } from 'lucide-react'

type Trip = { ref: string; routeLabel: string }
type Message = { id: string; body: string; authorRole: string; authorName?: string; time: string }
export function CustomerMessages({ trips, audience = 'customer', driverConversation = false, initialRef = '' }: { trips: Trip[]; audience?: 'customer' | 'staff' | 'driver'; driverConversation?: boolean; initialRef?: string }) {
  const [before, setBefore] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [selected, setSelected] = useState('')
  useEffect(() => { setSelected(initialRef || new URLSearchParams(window.location.search).get('ref') || '') }, [initialRef])
  const ref = trips.some(t => t.ref === selected) ? selected : trips[0]?.ref || ''
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  useNoticeToast(error)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const fetching = useRef<string | null>(null)
  const load = useCallback(async (signal?: AbortSignal) => {
    const requestKey = `${ref}:${before || ''}:${audience}:${driverConversation}`
    if (!ref || document.hidden || fetching.current === requestKey) return
    fetching.current = requestKey
    try {
      const pageQuery = before ? `&before=${encodeURIComponent(before)}` : ''
      const response = await fetch(driverConversation ? `/api/driver/bookings/${encodeURIComponent(ref)}/messages?${pageQuery.slice(1)}` : `/api/messages/${encodeURIComponent(ref)}?as=${audience}${pageQuery}`, { signal, cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) throw new Error(data?.message || 'Could not load messages.')
      if (!signal?.aborted) { setMessages(data.messages || []); setNextCursor(data.nextCursor || null); setError(''); const readResponse = await fetch(driverConversation ? `/api/driver/bookings/${encodeURIComponent(ref)}/messages` : `/api/messages/${encodeURIComponent(ref)}?as=${audience}`, { method: 'PATCH', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({messageIds:(data.messages || []).map((m:Message)=>m.id)}) }); if (!readResponse.ok) throw new Error('Messages loaded, but the read status could not be saved. Please retry.') }
    } catch (error) { if (!signal?.aborted) setError(error instanceof Error ? error.message : 'Could not load messages.'); throw error }
    finally { if (fetching.current === requestKey) fetching.current = null; if (!signal?.aborted) setLoading(false) }
  }, [ref, audience, driverConversation, before])
  useEffect(() => { setMessages([]); setError(''); setDraft(''); setBefore(null); setNextCursor(null); setLoading(!!ref) }, [ref])
  useLivePolling(load, !!ref, 10000)
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }) }, [messages])
  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!ref || !draft.trim() || sending) return
    setSending(true); setError('')
    try {
      const response = await fetch(driverConversation ? `/api/driver/bookings/${encodeURIComponent(ref)}/messages` : '/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(driverConversation ? { body: draft.trim() } : { bookingRef: ref, body: draft.trim(), as: audience }) })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) throw new Error(data?.message || 'Message was not sent. Please try again.')
      setDraft('')
      if (before) setBefore(null); else await load()
    } catch (error) { setError(error instanceof Error ? error.message : 'Message was not sent. Please try again.') }
    finally { setSending(false) }
  }
  return <aside className="flex min-h-[400px] min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-bg">
    <div className="border-b border-line p-4"><h2 className="flex items-center gap-2 font-display text-lg font-bold text-heading"><MessageCircle size={18} />{driverConversation ? 'Driver ↔ operations' : 'Messages'}</h2>
      {trips.length > 0 && <label className="mt-3 block text-xs text-muted">Booking<select disabled={sending} aria-label="Booking conversation" value={ref} onChange={e => setSelected(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-bg p-2 text-sm text-heading">{trips.map(t => <option key={t.ref} value={t.ref}>{t.ref} · {t.routeLabel}</option>)}</select></label>}
    </div>
    {ref && <div className="flex flex-wrap gap-3 border-b border-line px-4 py-2 text-xs"><button disabled={!nextCursor || loading} onClick={() => { setLoading(true); setBefore(nextCursor) }} className="font-semibold underline disabled:opacity-40">Older messages</button>{before && <button onClick={() => { setLoading(true); setBefore(null) }} className="font-semibold underline">Latest messages</button>}</div>}
    <div ref={list} className="max-h-[380px] min-h-[220px] flex-1 space-y-3 overflow-y-auto bg-surface p-4">
      {!ref ? <div className="py-8 text-center"><p className="font-semibold text-heading">No booking conversations yet</p><p className="mt-2 text-sm text-muted">{audience === 'customer' ? 'Book a ride to message our team about your trip.' : 'Assigned booking conversations will appear here.'}</p>{audience === 'customer' && <Link href="/book" className="mt-4 inline-block text-sm font-semibold text-link">Book a ride →</Link>}</div>
        : loading ? <p className="text-sm text-muted">Loading messages…</p>
        : messages.length === 0 ? <p className="text-sm text-muted">No messages yet. Ask our team about this booking.</p>
        : messages.map(m => <div key={m.id} className={`max-w-[90%] rounded-2xl p-3 text-sm ${m.authorRole === audience ? 'ml-auto bg-navy text-white' : 'bg-bg text-heading'}`}><p className="whitespace-pre-wrap break-words">{m.body}</p><p className="mt-1 text-[10px] opacity-70">{m.authorRole === audience ? 'You' : m.authorName || 'Support'} · {m.time}</p></div>)}
    </div>
    {error && <p role="alert" className="px-4 py-2 text-sm text-error">{error}</p>}
    <form onSubmit={send} className="shrink-0 border-t border-line bg-bg p-3">
      <label htmlFor={`message-${audience}`} className="mb-2 block text-sm font-semibold text-heading">Message operations</label>
      <div className="flex items-end gap-2"><textarea required id={`message-${audience}`} aria-label="Message" rows={2} value={draft} onChange={e => setDraft(e.target.value)} maxLength={4000} disabled={sending || !ref} placeholder={ref ? 'Type your message here…' : 'Choose a booking to start messaging'} className="min-w-0 flex-1 resize-y rounded-xl border border-input-line bg-input px-3 py-3 text-base text-heading outline-none focus:border-focus disabled:opacity-60" /><button disabled={!ref || sending || !draft.trim() || loading} aria-label="Send message" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-on-primary disabled:opacity-50"><Send size={18} /><span>Send</span></button></div>
      <p className="mt-2 text-xs text-muted">{ref ? 'Your message goes privately to the operations team.' : driverConversation ? 'Messaging becomes available when operations assigns you a journey.' : 'Your bookings appear above so you can start a conversation.'} {!ref && <Link href="/contact" className="font-semibold text-link underline">Contact support without a booking</Link>}</p>
    </form>
  </aside>
}
