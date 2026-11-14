'use client'

import React, { useEffect, useState } from 'react'

export type LibraryImage = { id: string; name: string; url: string }

export function ImageField({
  value,
  onChange,
  images: provided,
  onUploaded,
  allowClear = false,
}: {
  value: string
  onChange: (url: string) => void
  images?: LibraryImage[]
  onUploaded?: (image: LibraryImage) => void
  allowClear?: boolean
}) {
  const [images, setImages] = useState<LibraryImage[]>(provided || [])
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (provided) {
      setImages(provided)
      return
    }
    let cancelled = false
    fetch('/api/admin/library')
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled && body?.ok) setImages(body.images || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [provided])

  const upload = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    setMessage('')
    const form = new FormData()
    form.set('file', file)
    try {
    const res = await fetch('/api/admin/library', { method: 'POST', body: form })
    const body = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok || !body?.image?.url) {
      setMessage(body?.message || 'Could not upload the image')
      return
    }
    const image = body.image as LibraryImage
    setImages((current) => [image, ...current.filter((item) => item.id !== image.id)])
    onUploaded?.(image)
    onChange(image.url)
    setOpen(false)
    setMessage('Image ready. Save to publish it.')
    } catch { setMessage('Upload could not be confirmed. Please try again.') } finally { setBusy(false) }
  }

  return (
    <div className="mt-2 space-y-2">
      {value ? (
        <img src={value} alt="" className="h-28 w-full max-w-xs rounded-lg object-cover" />
      ) : (
        <p className="text-sm text-muted">No image yet</p>
      )}
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-on-primary">
          {busy ? 'Uploading…' : 'Upload image'}
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="sr-only" onChange={(event) => { upload(event.target.files?.[0] || null); event.target.value = '' }} />
        </label>
        <button type="button" onClick={() => setOpen((current) => !current)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-heading">
          {open ? 'Hide library' : 'Choose from library'}
        </button>
        {allowClear && value ? (
          <button type="button" onClick={() => onChange('')} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-error">Remove</button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-muted">{message}</p> : null}
      {open ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => { onChange(image.url); setOpen(false); setMessage('Image selected. Save to publish it.') }}
                className={`block w-full overflow-hidden rounded-lg border ${image.url === value ? 'border-focus ring-2 ring-focus' : 'border-line'}`}
              >
                <img src={image.url} alt={image.name} className="aspect-[4/3] w-full object-cover" />
                <span className="block truncate px-1 py-1 text-left text-[11px] text-heading">{image.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
