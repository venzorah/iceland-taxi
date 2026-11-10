'use client'

import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2, X } from 'lucide-react'

import { AnnouncementBar } from '@/components/site/AnnouncementBar'
import {
  BAR_STYLES, newAnnouncementId, statusOf, visibleAnnouncements,
  type Announcement, type AnnouncementSettings, type AnnouncementState, type AnnouncementStatus, type BarSpeed, type BarStyle,
} from '@/lib/design/announcements'

type Props = {
  value: AnnouncementState
  onChange: (next: AnnouncementState) => void
  /** Stack everything in one column, for the mobile admin app. */
  compact?: boolean
}

/** Full control over the site's announcement bar: add, edit, duplicate, reorder, schedule, switch off, delete. */
export function AnnouncementsManager({ value, onChange, compact }: Props) {
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [previewLang, setPreviewLang] = useState<'en' | 'is'>('en')

  const { settings, items } = value
  const liveCount = visibleAnnouncements(value).length
  const setSettings = (patch: Partial<AnnouncementSettings>) => onChange({ ...value, settings: { ...settings, ...patch } })
  const setItems = (next: Announcement[]) => onChange({ ...value, items: next })
  const patchItem = (id: string, patch: Partial<Announcement>) => setItems(items.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
  }
  const duplicate = (a: Announcement) => {
    const i = items.findIndex((x) => x.id === a.id)
    const copy = { ...a, id: newAnnouncementId(), text: `${a.text} (copy)`, active: false }
    setItems([...items.slice(0, i + 1), copy, ...items.slice(i + 1)])
  }
  const remove = (id: string) => {
    setItems(items.filter((a) => a.id !== id))
    setConfirmDelete(null)
    if (editing?.id === id) setEditing(null)
  }
  const startNew = () => {
    setIsNew(true)
    setEditing({ id: newAnnouncementId(), text: '', textIs: '', linkLabel: '', linkUrl: '', active: true, starts: '', ends: '' })
  }
  const save = (a: Announcement) => {
    setItems(isNew ? [...items, a] : items.map((x) => (x.id === a.id ? a : x)))
    setEditing(null)
    setIsNew(false)
  }

  return (
    <div className={compact ? 'space-y-4 p-4' : 'mx-auto max-w-6xl space-y-6 p-4 sm:p-6'}>
      {/* What visitors see right now */}
      <section className="overflow-hidden rounded-xl border border-line bg-bg">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-bold text-heading">Live on the website</h2>
            <p className="text-xs text-muted">
              {settings.enabled ? `${liveCount} of ${items.length} messages showing · scrolls above the menu on every public page` : 'The bar is switched off for all visitors'}
            </p>
          </div>
          <div className="flex items-center rounded-full border border-line p-0.5 text-xs font-semibold">
            {(['en', 'is'] as const).map((l) => (
              <button key={l} onClick={() => setPreviewLang(l)} className={`rounded-full px-2.5 py-1 uppercase transition-colors duration-150 ${previewLang === l ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted hover:text-heading'}`}>
                {l}
              </button>
            ))}
          </div>
          <Switch label="Show bar" checked={settings.enabled} onChange={(v) => setSettings({ enabled: v })} />
        </div>
        <div className="border-t border-line bg-surface p-3 sm:p-4">
          <div className="overflow-hidden rounded-lg border border-line bg-bg">
            {liveCount ? (
              <AnnouncementBar state={value} language={previewLang} />
            ) : (
              <p className="flex h-9 items-center justify-center text-xs text-muted">{settings.enabled ? 'No messages are live today' : 'Hidden'}</p>
            )}
            <div className="flex h-10 items-center gap-3 px-4">
              <span className="h-2.5 w-16 rounded-full bg-line" />
              <span className="ml-auto hidden h-2 w-10 rounded-full bg-line sm:block" />
              <span className="hidden h-2 w-10 rounded-full bg-line sm:block" />
              <span className="h-5 w-14 rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </section>

      <div className={compact ? 'space-y-4' : 'grid items-start gap-6 lg:grid-cols-[1fr_300px]'}>
        {/* Messages */}
        <section className="overflow-hidden rounded-xl border border-line bg-bg">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <h2 className="font-display text-base font-bold text-heading">Messages <span className="font-sans text-sm font-medium text-muted">· {items.length}</span></h2>
            <button onClick={startNew} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">
              <Plus size={15} /> New message
            </button>
          </div>
          {items.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-semibold text-heading">No announcements yet</p>
              <p className="mt-1 text-sm text-muted">Add a message and it starts scrolling above the site menu.</p>
            </div>
          ) : (
            <ol className="divide-y divide-line">
              {items.map((a, i) => {
                const st = statusOf(a)
                return (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                    <div className="flex shrink-0 flex-col pt-0.5">
                      <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></IconBtn>
                      <IconBtn label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></IconBtn>
                    </div>
                    <div className="min-w-0 flex-1">
                      <button onClick={() => { setIsNew(false); setEditing(a) }} className="block w-full text-left">
                        <p className={`text-sm font-semibold ${st === 'off' || st === 'expired' ? 'text-muted' : 'text-heading'}`}>{a.text || 'Untitled message'}</p>
                      </button>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <StatusPill status={st} />
                        <span>{scheduleLabel(a)}</span>
                        {a.linkLabel && <span className="text-link">{a.linkLabel} →</span>}
                        {!a.textIs && <span className="text-warning">No Icelandic text</span>}
                      </div>
                      {confirmDelete === a.id && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
                          <span className="text-heading">Delete this message?</span>
                          <button onClick={() => remove(a.id)} className="rounded-md bg-error px-3 py-1 text-xs font-bold text-white">Delete</button>
                          <button onClick={() => setConfirmDelete(null)} className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-heading">Cancel</button>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Switch label={a.active ? 'Turn off' : 'Turn on'} hideLabel checked={a.active} onChange={(v) => patchItem(a.id, { active: v })} />
                      {/* On phones, tapping the message opens the editor */}
                      <span className={compact ? 'hidden' : 'hidden items-center gap-0.5 sm:flex'}>
                        <IconBtn label="Edit" onClick={() => { setIsNew(false); setEditing(a) }}><Pencil size={15} /></IconBtn>
                        <IconBtn label="Duplicate" onClick={() => duplicate(a)}><Copy size={15} /></IconBtn>
                      </span>
                      <IconBtn label="Delete" danger onClick={() => setConfirmDelete(a.id)}><Trash2 size={15} /></IconBtn>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* Bar settings */}
        <section className="rounded-xl border border-line bg-bg p-4 sm:p-5">
          <h2 className="font-display text-base font-bold text-heading">Bar settings</h2>
          <p className="mt-4 text-xs font-semibold text-muted">Colour</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(Object.keys(BAR_STYLES) as BarStyle[]).map((k) => (
              <button
                key={k}
                onClick={() => setSettings({ style: k })}
                aria-pressed={settings.style === k}
                className={`rounded-lg border-2 p-1 transition-colors duration-150 ${settings.style === k ? 'border-focus' : 'border-transparent hover:border-line'}`}
              >
                <span className={`block h-7 rounded-md ${BAR_STYLES[k].bar.split(' ')[0]}`} />
                <span className="mt-1 block text-xs font-semibold text-heading">{BAR_STYLES[k].label}</span>
              </button>
            ))}
          </div>
          <p className="mt-5 text-xs font-semibold text-muted">Scroll speed</p>
          <div className="mt-2 grid grid-cols-3 rounded-lg bg-surface p-1 text-sm font-semibold">
            {(['slow', 'normal', 'fast'] as BarSpeed[]).map((sp) => (
              <button key={sp} onClick={() => setSettings({ speed: sp })} className={`rounded-md py-1.5 capitalize transition-colors duration-150 ${settings.speed === sp ? 'bg-bg text-heading shadow-sm' : 'text-muted hover:text-heading'}`}>
                {sp}
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-heading">Pause on hover</p>
              <p className="text-xs text-muted">Lets visitors stop and read</p>
            </div>
            <Switch label="Pause on hover" hideLabel checked={settings.pauseOnHover} onChange={(v) => setSettings({ pauseOnHover: v })} />
          </div>
          <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
            Visitors who prefer reduced motion see the messages still, and can scroll them sideways.
          </p>
        </section>
      </div>

      <Editor
        value={editing}
        isNew={isNew}
        compact={compact}
        onCancel={() => { setEditing(null); setIsNew(false) }}
        onSave={save}
        onDelete={(id) => remove(id)}
      />
    </div>
  )
}

function Editor({ value, isNew, compact, onCancel, onSave, onDelete }: {
  value: Announcement | null; isNew: boolean; compact?: boolean
  onCancel: () => void; onSave: (a: Announcement) => void; onDelete: (id: string) => void
}) {
  return (
    <AnimatePresence>
      {value && (
        <div className={`${compact ? 'absolute' : 'fixed'} inset-0 z-[70] flex justify-end`}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} onClick={onCancel} className="absolute inset-0 bg-navy/50" />
          <motion.div
            key={value.id}
            role="dialog"
            aria-label={isNew ? 'New announcement' : 'Edit announcement'}
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            className="relative flex h-full w-full max-w-md flex-col bg-bg font-sans text-text shadow-2xl"
          >
            <EditorForm initial={value} isNew={isNew} onCancel={onCancel} onSave={onSave} onDelete={onDelete} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function EditorForm({ initial, isNew, onCancel, onSave, onDelete }: {
  initial: Announcement; isNew: boolean; onCancel: () => void; onSave: (a: Announcement) => void; onDelete: (id: string) => void
}) {
  const [a, setA] = useState(initial)
  const set = (patch: Partial<Announcement>) => setA((x) => ({ ...x, ...patch }))
  const dateError = a.starts && a.ends && a.ends < a.starts ? 'End date is before the start date' : ''
  const canSave = a.text.trim().length > 0 && !dateError

  return (
    <>
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-display text-lg font-bold text-heading">{isNew ? 'New announcement' : 'Edit announcement'}</h2>
        <button onClick={onCancel} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-heading transition-colors duration-150 hover:bg-surface"><X size={18} /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <TextArea label="Message · English" required value={a.text} max={140} onChange={(v) => set({ text: v })} placeholder="e.g. Free child seats on all airport transfers this month." />
        <TextArea label="Message · Icelandic" value={a.textIs} max={140} onChange={(v) => set({ textIs: v })} placeholder="Shown on the Icelandic site. Uses English if empty." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Link text" value={a.linkLabel} onChange={(v) => set({ linkLabel: v })} placeholder="Optional, e.g. Book now" />
          <Field label="Link URL" value={a.linkUrl} onChange={(v) => set({ linkUrl: v })} placeholder="/tours/golden-circle" />
        </div>
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Show from" type="date" value={a.starts} onChange={(v) => set({ starts: v })} />
            <Field label="Show until" type="date" value={a.ends} onChange={(v) => set({ ends: v })} />
          </div>
          <p className={`mt-1.5 text-xs ${dateError ? 'text-error' : 'text-muted'}`}>{dateError || 'Leave empty to show it until you switch it off.'}</p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-heading">Active</p>
            <p className="text-xs text-muted">Off keeps it saved but hidden</p>
          </div>
          <Switch label="Active" hideLabel checked={a.active} onChange={(v) => set({ active: v })} />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-line px-5 py-4">
        {!isNew && (
          <button onClick={() => onDelete(a.id)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-error transition-colors duration-150 hover:bg-surface">
            <Trash2 size={15} /> Delete
          </button>
        )}
        <button onClick={onCancel} className="ml-auto rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-heading transition-colors duration-150 hover:bg-surface">Cancel</button>
        <button
          disabled={!canSave}
          onClick={() => onSave({ ...a, text: a.text.trim(), textIs: a.textIs.trim() })}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isNew ? 'Add message' : 'Save changes'}
        </button>
      </div>
    </>
  )
}

function StatusPill({ status }: { status: AnnouncementStatus }) {
  const map: Record<AnnouncementStatus, [string, string]> = {
    live: ['Live', 'bg-success/10 text-success'],
    scheduled: ['Scheduled', 'bg-link/10 text-link'],
    expired: ['Ended', 'bg-surface text-muted'],
    off: ['Off', 'bg-surface text-muted'],
  }
  const [label, cls] = map[status]
  return <span className={`rounded-full px-2 py-0.5 font-semibold ${cls}`}>{label}</span>
}

function scheduleLabel(a: Announcement) {
  const f = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  if (a.starts && a.ends) return `${f(a.starts)} – ${f(a.ends)}`
  if (a.starts) return `From ${f(a.starts)}`
  if (a.ends) return `Until ${f(a.ends)}`
  return 'No end date'
}

function Switch({ label, checked, onChange, hideLabel }: { label: string; checked: boolean; onChange: (v: boolean) => void; hideLabel?: boolean }) {
  return (
    <div className="flex items-center gap-2 p-1.5 text-sm font-semibold text-heading">
      {!hideLabel && <span className="whitespace-nowrap" aria-hidden>{label}</span>}
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150 ${checked ? 'bg-mint' : 'bg-input-line'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ease-out ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

function IconBtn({ label, onClick, children, disabled, danger }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-md transition-colors duration-150 hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent ${danger ? 'text-error' : 'text-muted hover:text-heading'}`}
    >
      {children}
    </button>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted focus:border-focus" />
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder, max, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; max: number; required?: boolean }) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs font-semibold text-muted">
        <span>{label}{required && <span className="text-error"> *</span>}</span>
        <span className={value.length > max ? 'text-error' : ''}>{value.length}/{max}</span>
      </span>
      <textarea rows={2} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full resize-none rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted focus:border-focus" />
    </label>
  )
}
