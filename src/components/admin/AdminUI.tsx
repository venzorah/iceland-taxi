'use client'

import { useNoticeToast } from '@/components/feedback/FormFeedback'
import { noticeKind, notify } from '@/lib/forms/feedback'
import { validateFields } from '@/lib/forms/validation'
import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Inbox, LoaderCircle, X } from 'lucide-react'

export const adminInput = 'mt-1 w-full rounded-xl border border-input-line bg-input px-3 py-2.5 text-sm text-heading outline-none focus:border-focus'

export async function adminRequest<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) throw new Error(data?.message || 'Could not complete this action. Please try again.')
  if ((init?.method || 'GET').toUpperCase() !== 'GET' && /^\/api\/admin\/(services|routes|pricing|catalogue)(\/|$)/.test(url)) {
    window.dispatchEvent(new Event('itb-catalogue-updated'))
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('itb-catalogue') : null
    channel?.postMessage('changed'); channel?.close()
  }
  return data as T
}

export function AdminModal({ title, children, onClose, busy = false }: { title: string; children: React.ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted || !ref.current) return
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    dialog.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus() }
  }, [mounted])
  const close = () => { if (!busy && !ref.current?.querySelector('form[aria-busy="true"]')) onClose() }
  if (!mounted) return null
  return createPortal(<dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === event.currentTarget && !busy) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close() } }} className="m-auto max-h-[88dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-3xl border border-line bg-bg p-0 font-sans text-heading shadow-2xl backdrop:bg-navy/60">
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-bg px-5 py-4"><h2 id={titleId} className="font-display text-lg font-bold">{title}</h2><button type="button" disabled={busy} onClick={close} aria-label="Close dialog" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface disabled:opacity-50"><X size={18} /></button></header>
    <div className="p-5">{children}</div>
  </dialog>, document.body)
}

const FormBusy = createContext(false)
export function AdminForm({ onSubmit, children, ...props }: Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> & { onSubmit: (event: React.FormEvent<HTMLFormElement>) => unknown }) {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  return <FormBusy.Provider value={busy}><form {...props} aria-busy={busy} onSubmit={async event => { event.preventDefault(); if (lock.current || !validateFields(event.currentTarget)) return; lock.current = true; setBusy(true); try { await onSubmit(event) } catch (e) { notify(e instanceof Error ? e.message : 'Could not save. Please try again.', 'error') } finally { lock.current = false; setBusy(false) } }}><fieldset disabled={busy} className="contents">{children}</fieldset></form></FormBusy.Provider>
}

export function AdminButton({ children, onClick, pendingLabel, disabled, ...props }: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & { onClick?: (event: React.MouseEvent<HTMLButtonElement>) => unknown; pendingLabel?: string }) {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const formBusy = useContext(FormBusy)
  const pending = busy || (props.type === 'submit' && formBusy)
  const caption = typeof children === 'string' ? children.trim().toLowerCase() : ''
  const pendingText = pendingLabel || (caption.startsWith('publish') ? 'Publishing…' : caption.startsWith('save') ? 'Saving…' : caption.startsWith('delete') ? 'Deleting…' : caption.startsWith('archive') ? 'Archiving…' : caption.includes('reload') || caption.includes('retry') || caption.includes('try again') ? 'Loading…' : 'Working…')
  return <><button {...props} disabled={disabled || pending} aria-busy={pending} onClick={onClick ? async event => { if (lock.current) return; try { const result = onClick(event); if (result && typeof (result as Promise<unknown>).then === 'function') { lock.current = true; setBusy(true); await result } } catch (e) { notify(e instanceof Error ? e.message : 'Could not complete this action. Please try again.', 'error') } finally { lock.current = false; setBusy(false) } } : undefined} className={`${props.className || ''} disabled:cursor-not-allowed disabled:opacity-60`}>{pending ? <span className="inline-flex items-center justify-center gap-2"><LoaderCircle size={16} className="shrink-0 animate-spin" aria-hidden /><span className={props['aria-label'] ? 'sr-only' : ''}>{pendingText}</span></span> : children}</button></>
}

export function AdminToggle({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (checked: boolean) => unknown; disabled?: boolean }) {
  return <AdminButton type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-heading"><span aria-hidden className={`relative block h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-mint' : 'bg-input-line'}`}><span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} /></span><span>{label}</span></AdminButton>
}

export function AdminEmpty({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-bg px-5 py-10 text-center"><span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface text-muted"><Inbox size={23} /></span><h3 className="font-display text-base font-bold text-heading">{title}</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>{action && <div className="mt-4">{action}</div>}</div>
}

export function AdminNotice({ message }: { message: string | null }) {
  useNoticeToast(message)
  return message && !noticeKind(message) ? <p role="status" className="rounded-xl border border-line bg-bg px-4 py-3 text-sm text-heading">{message}</p> : null
}

type Confirmation = { title: string; description: string; confirmLabel?: string; danger?: boolean }
const ConfirmContext = createContext<((options: Confirmation) => Promise<boolean>) | null>(null)
export function AdminInteractions({ children }: { children: React.ReactNode }) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const resolver = useRef<((answer: boolean) => void) | null>(null)
  useEffect(() => () => { resolver.current?.(false) }, [])
  const close = (answer: boolean) => { resolver.current?.(answer); resolver.current = null; setConfirmation(null) }
  return <ConfirmContext.Provider value={options => new Promise(resolve => { resolver.current?.(false); resolver.current = resolve; setConfirmation(options) })}>{children}{confirmation && <AdminModal title={confirmation.title} onClose={() => close(false)}><p className="text-sm leading-relaxed text-muted">{confirmation.description}</p><div className="mt-6 flex justify-end gap-3"><button autoFocus type="button" onClick={() => close(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold">Cancel</button><button type="button" onClick={() => close(true)} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${confirmation.danger ? 'bg-error text-white' : 'bg-primary text-on-primary'}`}>{confirmation.confirmLabel || 'Confirm'}</button></div></AdminModal>}</ConfirmContext.Provider>
}
export function useAdminConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('AdminInteractions is required')
  return confirm
}
