'use client'

import React, { useEffect, useState } from 'react'

type Block = { key: string; kind: 'image' | 'text'; group: string; label: string; value: string }
type LibraryImage = { id: string; name: string; url: string }

export function WebsiteContent() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [images, setImages] = useState<LibraryImage[]>([])
  const [message, setMessage] = useState('Loading public content…')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/admin/site-blocks').then((res) => res.json()),
      fetch('/api/admin/library').then((res) => res.json()),
    ]).then(([content, library]) => {
      if (cancelled) return
      if (!content?.ok) {
        setMessage(content?.message || 'Could not load public content')
        return
      }
      setBlocks(content.blocks || [])
      setImages(library?.images || [])
      setMessage('Public text and images')
    }).catch(() => {
      if (!cancelled) setMessage('Could not load public content')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const update = (key: string, value: string) => {
    setBlocks((current) => current.map((block) => block.key === key ? { ...block, value } : block))
  }

  const save = async (block: Block) => {
    setSaving(block.key)
    const res = await fetch('/api/admin/site-blocks', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: block.key, value: block.value }),
    })
    const body = await res.json().catch(() => null)
    setSaving(null)
    if (!res.ok || !body?.ok) {
      setMessage(body?.message || 'Could not save')
      return
    }
    update(block.key, body.value)
    setMessage('Saved. The public site uses this value.')
  }

  const groups = [...new Set(blocks.map((block) => block.group))]

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div>
        <h2 className="font-display text-base font-bold text-heading">Website content</h2>
        <p className="mt-1 text-sm text-muted">Edit the public wording and the photos used on the site. Clearing a field and saving restores the original.</p>
        <p className="mt-2 text-xs text-muted">{message}</p>
      </div>
      {groups.map((group) => (
        <section key={group}>
          <h3 className="font-display text-sm font-bold text-heading">{group}</h3>
          <ul className="mt-3 space-y-3">
            {blocks.filter((block) => block.group === group).map((block) => (
              <li key={block.key} className="rounded-xl border border-line bg-bg p-4">
                <label className="block text-xs font-semibold text-muted">
                  {block.label}
                  {block.kind === 'image' ? (
                    <span className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <img src={block.value} alt="" className="h-16 w-24 rounded-lg object-cover" />
                      <select value={block.value} onChange={(event) => update(block.key, event.target.value)} className="min-w-0 flex-1 rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus">
                        <option value={block.value}>{block.value}</option>
                        {images.filter((image) => image.url !== block.value).map((image) => (
                          <option key={image.id} value={image.url}>{image.name} · {image.url}</option>
                        ))}
                      </select>
                    </span>
                  ) : (
                    <textarea rows={block.value.length > 120 ? 4 : 2} value={block.value} onChange={(event) => update(block.key, event.target.value)} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus" />
                  )}
                </label>
                <button type="button" disabled={saving === block.key} onClick={() => save(block)} className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-on-primary disabled:opacity-60">
                  {saving === block.key ? 'Saving…' : 'Save'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
