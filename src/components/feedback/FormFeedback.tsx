'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, TriangleAlert, X } from 'lucide-react'
import { notify, noticeKind, type ToastKind } from '@/lib/forms/feedback'
import { validateFields } from '@/lib/forms/validation'
export function useNoticeToast(message: string | null | undefined, kind?: ToastKind) {
  useEffect(() => { if (message) { const resolved = kind || noticeKind(message); if (resolved) notify(message, resolved) } }, [message, kind])
}
type Toast = { id: number; message: string; kind: ToastKind }
export function FormFeedback() {
  const pathname = usePathname()
  const admin = /^\/(admin(?:\/|$|-login)|m(?:\/|$))/.test(pathname)
  const [customerTarget, setCustomerTarget] = useState<HTMLDialogElement | null>(null)
  const customerDialog = useRef<HTMLDialogElement>(null)
  const [items, setItems] = useState<Toast[]>([]), [mounted, setMounted] = useState(false)
  const viewport = useRef<HTMLDivElement>(null), nextId = useRef(0)
  useEffect(() => {
    setMounted(true)
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; kind: ToastKind }>).detail
      if (!detail || typeof detail.message !== 'string' || !['success','error','info','warning'].includes(detail.kind)) return
      if (!admin) {
        const dialogs = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].filter(dialog => dialog !== customerDialog.current)
        setCustomerTarget(dialogs.at(-1) || null)
      }
      const item = { ...detail, id: ++nextId.current }
      setItems(current => {
        const remaining = item.kind === 'error' || item.kind === 'success' ? current.filter(t => t.kind !== 'error') : current
        return remaining.some(t => t.message === item.message && t.kind === item.kind) ? remaining : [...remaining.slice(-2), item]
      })
    }
    const invalid = (event: Event) => {
      const field = event.target as HTMLInputElement
      notify(field.validationMessage || 'Please check the highlighted field.', 'error')
    }
    const submit = (event: Event) => {
      if (event.target instanceof HTMLFormElement && !validateFields(event.target)) { event.preventDefault(); event.stopPropagation() }
    }
    const input = (event: Event) => {
      const field = event.target as HTMLInputElement
      if (field.dataset?.requiredWhitespace) { field.setCustomValidity(''); delete field.dataset.requiredWhitespace }
    }
    window.addEventListener('itb-toast', receive); document.addEventListener('invalid', invalid, true); document.addEventListener('submit', submit, true); document.addEventListener('input', input, true)
    return () => { window.removeEventListener('itb-toast', receive); document.removeEventListener('invalid', invalid, true); document.removeEventListener('submit', submit, true); document.removeEventListener('input', input, true) }
  }, [admin])
  useEffect(() => {
    if (!admin) return
    if (!items.length) { viewport.current?.hidePopover?.(); return }
    viewport.current?.hidePopover?.(); viewport.current?.showPopover?.()
    const timer = setTimeout(() => setItems(current => current.slice(1)), 6000)
    return () => clearTimeout(timer)
  }, [items, admin])
  useEffect(() => {
    if (admin || !items.length || !customerTarget) return
    const children = [...customerTarget.children].filter((child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute('data-feedback-section'))
    const previous = children.map(child => ({ child, display: child.style.display, inert: child.inert }))
    previous.forEach(({ child }) => { child.style.display = 'none'; child.inert = true })
    const observer = new MutationObserver(() => { if (!customerTarget.isConnected || !customerTarget.open) setCustomerTarget(null) })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] })
    return () => { observer.disconnect(); previous.forEach(({ child, display, inert }) => { child.style.display = display; child.inert = inert }) }
  }, [admin, items.length, customerTarget])
  useEffect(() => {
    if (admin || customerTarget || !items.length) { customerDialog.current?.close(); return }
    if (customerDialog.current && !customerDialog.current.open) customerDialog.current.showModal()
  }, [admin, customerTarget, items.length])
  const dismiss = () => { setItems([]); setCustomerTarget(null) }
  if (!mounted) return null
  const latest = items.at(-1)
  if (!admin) {
    const content = latest && <section data-feedback-section role={latest.kind === 'error' ? 'alert' : 'status'} className="space-y-5 p-6 text-center text-heading sm:p-8">
      {latest.kind === 'success' ? <CheckCircle2 size={40} className="mx-auto text-emerald-600" /> : latest.kind === 'error' ? <AlertCircle size={40} className="mx-auto text-error" /> : <Info size={40} className="mx-auto text-link" />}
      <h2 className="text-xl font-bold">{latest.kind === 'success' ? 'Success' : latest.kind === 'error' ? 'Please check' : latest.kind === 'warning' ? 'Please note' : 'Update'}</h2>
      <p className="break-words text-sm leading-relaxed">{latest.message}</p>
      <button autoFocus type="button" onClick={dismiss} className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary">{latest.kind === 'error' ? 'Back to form' : 'Continue'}</button>
    </section>
    return customerTarget && latest ? createPortal(content, customerTarget) : createPortal(<dialog ref={customerDialog} aria-label="Form feedback" onCancel={event => { event.preventDefault(); dismiss() }} className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl border border-line bg-bg p-0 shadow-2xl backdrop:bg-navy/60">{content}</dialog>, document.body)
  }
  return createPortal(<div ref={viewport} popover="manual" aria-label="Notifications" className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-auto right-4 top-auto z-[9999] m-0 w-[calc(100vw-2rem)] max-w-sm space-y-3 overflow-visible border-0 bg-transparent p-0 text-heading">
    {items.map(item => { const Icon = item.kind === 'success' ? CheckCircle2 : item.kind === 'error' ? AlertCircle : item.kind === 'warning' ? TriangleAlert : Info
      return <div key={item.id} role={item.kind === 'error' ? 'alert' : 'status'} className="flex items-start gap-3 rounded-2xl border border-line bg-bg p-4 shadow-xl"><Icon size={22} aria-hidden className={`mt-0.5 shrink-0 ${item.kind === 'success' ? 'text-emerald-600' : item.kind === 'error' ? 'text-error' : item.kind === 'warning' ? 'text-amber-600' : 'text-link'}`} /><p className="min-w-0 flex-1 break-words text-sm leading-relaxed">{item.message}</p><button type="button" onClick={() => setItems(current => current.filter(t => t.id !== item.id))} aria-label="Dismiss notification" className="shrink-0 rounded-lg p-1 text-muted"><X size={16} /></button></div> })}
  </div>, document.body)
}
