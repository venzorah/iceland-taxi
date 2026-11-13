'use client'

import React, { useEffect, useState } from 'react'

type LibraryImage = { id: string; name: string; url: string; alt: string; source: 'built-in' | 'upload' }

export function ImageLibrary() {
  const [images, setImages] = useState<LibraryImage[]>([])
  const [message, setMessage] = useState('Loading images…')
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/library')
    const body = await res.json().catch(() => null)
    if (!body?.ok) {
      setMessage(body?.message || 'Could not load the image library')
      return
    }
    setImages(body.images || [])
    setMessage(`${body.images?.length || 0} images`)
  }

  useEffect(() => {
    load()
  }, [])

  const upload = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!file) return
    setBusy(true)
    const form = new FormData()
    form.set('file', file)
    form.set('alt', alt)
    const res = await fetch('/api/admin/library', { method: 'POST', body: form })
    const body = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok || !body?.ok) {
      setMessage(body?.message || 'Could not upload the image')
      return
    }
    setFile(null)
    setAlt('')
    setMessage('Image added')
    await load()
  }

  const replace = async (image: LibraryImage, file: File | null) => {
    if (!file) return
    setBusy(true)
    const form = new FormData()
    form.set('file', file)
    const res = await fetch(`/api/admin/library/${encodeURIComponent(image.id)}`, { method: 'PATCH', body: form })
    const body = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok || !body?.ok) {
      setMessage(body?.message || 'Could not replace the image')
      return
    }
    setMessage('Image replaced. Pages that use it show the new photo.')
    await load()
  }

  const remove = async (image: LibraryImage) => {
    const res = await fetch(`/api/admin/library/${encodeURIComponent(image.id)}`, { method: 'DELETE' })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.ok) {
      setMessage(body?.message || 'Could not delete the image')
      return
    }
    setMessage('Image removed')
    await load()
  }

  return (
    <div className="p-4 sm:p-6">
      <h2 className="font-display text-base font-bold text-heading">Image library</h2>
      <p className="mt-1 text-sm text-muted">Every photo on the site. Upload a new one, or replace an uploaded photo. Built-in photos are changed from Website content.</p>
      <form onSubmit={upload} className="mt-4 flex flex-col gap-2 rounded-xl border border-line bg-bg p-4 sm:flex-row sm:items-end">
        <label className="text-xs font-semibold text-muted">
          Image file
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-1 block text-sm text-heading" />
        </label>
        <label className="min-w-0 flex-1 text-xs font-semibold text-muted">
          Description
          <input value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="What the image shows" className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none placeholder:text-muted focus:border-focus" />
        </label>
        <button disabled={busy || !file} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60">{busy ? 'Uploading…' : 'Add image'}</button>
      </form>
      <p className="mt-3 text-xs text-muted">{message}</p>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image) => (
          <li key={image.id} className="overflow-hidden rounded-xl border border-line bg-card">
            <img src={image.url} alt={image.alt || image.name} className="aspect-[4/3] w-full object-cover" />
            <div className="space-y-1 p-3">
              <p className="truncate text-sm font-semibold text-heading">{image.name}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{image.source === 'upload' ? 'Uploaded' : 'Built-in'}</p>
              {image.source === 'upload' && (
                <div className="flex gap-3">
                  <label className="cursor-pointer text-xs font-semibold text-link">
                    Replace
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { replace(image, event.target.files?.[0] || null); event.target.value = '' }} />
                  </label>
                  <button type="button" onClick={() => remove(image)} className="text-xs font-semibold text-error">Delete</button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
