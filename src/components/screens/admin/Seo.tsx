'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

type SeoPage = {
  id: string
  path: string
  titleEn: string | null
  titleIs: string | null
  descriptionEn: string | null
  descriptionIs: string | null
  noIndex: boolean
}

const inputClass = 'mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus'

export function Seo() {
  const [pages, setPages] = useState<SeoPage[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [msg, setMsg] = useState('Loading…')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ path: '', titleEn: '', descriptionEn: '', titleIs: '', descriptionIs: '', noIndex: false })

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/seo')
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      setMsg(data?.message || 'Could not load SEO pages')
      setPages([])
      return
    }
    setPages(data.pages)
    setSelId((prev) => prev || data.pages[0]?.id || null)
    setMsg('Live database')
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selected = pages.find((page) => page.id === selId) || pages[0]

  useEffect(() => {
    if (!selected) return
    setDraft({
      path: selected.path,
      titleEn: selected.titleEn || '',
      descriptionEn: selected.descriptionEn || '',
      titleIs: selected.titleIs || '',
      descriptionIs: selected.descriptionIs || '',
      noIndex: selected.noIndex,
    })
  }, [selected])

  const save = async () => {
    setMsg('Saving…')
    const payload = {
      path: draft.path,
      titleEn: draft.titleEn || null,
      titleIs: draft.titleIs || null,
      descriptionEn: draft.descriptionEn || null,
      descriptionIs: draft.descriptionIs || null,
      noIndex: draft.noIndex,
    }
    const res = await fetch(creating || !selected ? '/api/admin/seo' : `/api/admin/seo/${selected.id}`, {
      method: creating || !selected ? 'POST' : 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      setMsg(data?.message || 'Could not save the page')
      return
    }
    setCreating(false)
    setMsg('Saved')
    await load()
    if (data.page?.id) setSelId(data.page.id)
  }

  return (
    <div className="grid min-h-0 lg:h-full lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px]">
      <div className="min-h-0 p-3 sm:p-6 lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-heading">Landing pages</h2>
          <button
            onClick={() => {
              setCreating(true)
              setSelId(null)
              setDraft({ path: '/', titleEn: '', descriptionEn: '', titleIs: '', descriptionIs: '', noIndex: false })
            }}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-on-primary"
          >
            <Plus size={15} /> New page
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">{msg}</p>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg">
          {pages.map((page) => (
            <li key={page.id}>
              <button onClick={() => { setCreating(false); setSelId(page.id) }} className={`flex w-full items-center gap-4 px-4 py-3 text-left ${selId === page.id && !creating ? 'bg-surface' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-heading">{page.titleEn || page.path}</p>
                  <p className="truncate font-mono text-xs text-muted">{page.path}</p>
                </div>
                <span className={`shrink-0 text-xs font-semibold ${page.noIndex ? 'text-muted' : 'text-success'}`}>{page.noIndex ? 'No index' : 'Index'}</span>
              </button>
            </li>
          ))}
          {pages.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">No SEO pages saved yet.</li>}
        </ul>
        <p className="mt-3 text-xs text-muted">Titles and descriptions are stored on the SEO page record. Sitemap and robots still follow the published public routes.</p>
      </div>

      <aside className="min-h-0 border-t border-line bg-bg p-4 sm:p-6 lg:overflow-y-auto lg:border-l lg:border-t-0">
        <p className="text-xs font-semibold text-muted">{creating ? 'New page' : 'Editing'}</p>
        <label className="mt-4 block text-xs font-semibold text-muted">Path<input value={draft.path} onChange={(event) => setDraft({ ...draft, path: event.target.value })} className={inputClass} /></label>
        <label className="mt-4 block text-xs font-semibold text-muted">SEO title · English <span className={draft.titleEn.length > 60 ? 'text-error' : ''}>{draft.titleEn.length}/60</span><input value={draft.titleEn} onChange={(event) => setDraft({ ...draft, titleEn: event.target.value })} className={inputClass} /></label>
        <label className="mt-4 block text-xs font-semibold text-muted">Meta description · English <span className={draft.descriptionEn.length > 160 ? 'text-error' : ''}>{draft.descriptionEn.length}/160</span><textarea rows={3} value={draft.descriptionEn} onChange={(event) => setDraft({ ...draft, descriptionEn: event.target.value })} className={inputClass} /></label>
        <label className="mt-4 block text-xs font-semibold text-muted">SEO title · Icelandic<input value={draft.titleIs} onChange={(event) => setDraft({ ...draft, titleIs: event.target.value })} className={inputClass} /></label>
        <label className="mt-4 block text-xs font-semibold text-muted">Meta description · Icelandic<textarea rows={3} value={draft.descriptionIs} onChange={(event) => setDraft({ ...draft, descriptionIs: event.target.value })} className={inputClass} /></label>
        <label className="mt-4 flex items-center justify-between text-sm text-heading">
          Hide from search engines
          <input type="checkbox" checked={draft.noIndex} onChange={(event) => setDraft({ ...draft, noIndex: event.target.checked })} className="h-4 w-4 accent-[var(--mint)]" />
        </label>
        <div className="mt-6 rounded-lg border border-line bg-white p-4">
          <p className="truncate text-xs text-[#4d5156]">icelandtaxibooking.com{draft.path || '/'}</p>
          <p className="mt-1 truncate text-lg text-[#1a0dab]">{draft.titleEn || 'Untitled'}</p>
          <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{draft.descriptionEn}</p>
        </div>
        <button onClick={save} className="mt-6 w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-on-primary">Save page</button>
      </aside>
    </div>
  )
}
