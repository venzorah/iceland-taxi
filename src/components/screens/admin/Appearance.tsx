'use client'

import React, { useState } from 'react'
import { Monitor, RotateCcw, Smartphone } from 'lucide-react'

import { LOGO_DARK, LOGO_LIGHT } from '@/lib/design/data'

const OFFICIAL = { navy: '#061B3A', yellow: '#FFC400', mint: '#00CFA5', cyan: '#00AEEF' }
const SURFACES = ['Public website', 'Customer app', 'Admin dashboard', 'Driver portal']

export function Appearance() {
  const [enabled, setEnabled] = useState({ light: true, dark: true })
  const [defaults, setDefaults] = useState<Record<string, 'light' | 'dark'>>({ 'Public website': 'light', 'Customer app': 'light', 'Admin dashboard': 'light', 'Driver portal': 'dark' })
  const [colors, setColors] = useState(OFFICIAL)
  const [preview, setPreview] = useState<{ mode: 'light' | 'dark'; device: 'desktop' | 'mobile' }>({ mode: 'light', device: 'desktop' })
  const changed = JSON.stringify(colors) !== JSON.stringify(OFFICIAL)

  const toggle = (k: 'light' | 'dark') => {
    const next = { ...enabled, [k]: !enabled[k] }
    if (!next.light && !next.dark) return
    setEnabled(next)
    const only = next.light ? 'light' : 'dark'
    if (!next.light || !next.dark) setDefaults(Object.fromEntries(SURFACES.map((s) => [s, only])) as Record<string, 'light' | 'dark'>)
  }

  const bg = preview.mode === 'dark' ? colors.navy : '#FFFFFF'
  const fg = preview.mode === 'dark' ? '#FFFFFF' : colors.navy

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 p-3 sm:gap-6 sm:p-6 xl:grid-cols-[1fr_520px]">
      <div className="space-y-6">
        <section className="rounded-xl border border-line bg-bg p-5">
          <h2 className="font-display text-base font-bold text-heading">Available themes</h2>
          <p className="mt-1 text-sm text-muted">A disabled theme cannot be chosen by anyone. At least one must stay on.</p>
          <div className="mt-4 divide-y divide-line">
            {(['light', 'dark'] as const).map((k) => (
              <label key={k} className="flex items-center justify-between py-3">
                <span className="text-sm font-semibold capitalize text-heading">{k} mode</span>
                <button role="switch" aria-checked={enabled[k]} onClick={() => toggle(k)} className={`relative h-6 w-11 rounded-full transition-colors duration-150 ${enabled[k] ? 'bg-mint' : 'bg-input-line'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ease-out ${enabled[k] ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-bg p-5">
          <h2 className="font-display text-base font-bold text-heading">Default theme by surface</h2>
          <p className="mt-1 text-sm text-muted">Applies to people without a saved preference. Personal choices are never overwritten.</p>
          <div className="mt-4 divide-y divide-line">
            {SURFACES.map((s) => (
              <div key={s} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm font-medium text-heading">{s}</span>
                <div className="inline-flex rounded-lg border border-line p-0.5 text-xs font-semibold">
                  {(['light', 'dark'] as const).map((m) => (
                    <button key={m} disabled={!enabled[m]} onClick={() => setDefaults((d) => ({ ...d, [s]: m }))} className={`rounded-md px-3 py-1.5 capitalize transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-35 ${defaults[s] === m ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-bg p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-heading">Brand colours</h2>
            <button disabled={!changed} onClick={() => setColors(OFFICIAL)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-link disabled:opacity-40"><RotateCcw size={14} /> Restore official defaults</button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([
              ['navy', 'Brand navy · backgrounds & headings'],
              ['yellow', 'Primary buttons'],
              ['mint', 'Secondary accents'],
              ['cyan', 'Links & highlights'],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-3 rounded-lg border border-line p-3">
                <input type="color" value={colors[k]} onChange={(e) => setColors((c) => ({ ...c, [k]: e.target.value.toUpperCase() }))} className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-heading">{label}</span>
                  <span className="block font-mono text-xs text-muted">{colors[k]}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <button className="rounded-lg border border-line bg-bg px-4 py-2.5 text-sm font-semibold text-heading">Discard</button>
          <button className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">Publish theme</button>
        </div>
      </div>

      {/* Preview */}
      <section className="self-start rounded-xl border border-line bg-bg p-5 xl:sticky xl:top-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-heading">Preview</h2>
          <div className="flex gap-2">
            <div className="inline-flex rounded-lg border border-line p-0.5 text-xs font-semibold">
              {(['light', 'dark'] as const).map((m) => (
                <button key={m} onClick={() => setPreview((p) => ({ ...p, mode: m }))} className={`rounded-md px-3 py-1.5 capitalize ${preview.mode === m ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted'}`}>{m}</button>
              ))}
            </div>
            <div className="inline-flex rounded-lg border border-line p-0.5">
              <button aria-label="Desktop" onClick={() => setPreview((p) => ({ ...p, device: 'desktop' }))} className={`rounded-md px-2 py-1.5 ${preview.device === 'desktop' ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted'}`}><Monitor size={14} /></button>
              <button aria-label="Mobile" onClick={() => setPreview((p) => ({ ...p, device: 'mobile' }))} className={`rounded-md px-2 py-1.5 ${preview.device === 'mobile' ? 'bg-navy text-white dark:bg-white dark:text-navy' : 'text-muted'}`}><Smartphone size={14} /></button>
            </div>
          </div>
        </div>
        <div className="mt-4 grid place-items-center rounded-lg bg-surface p-4">
          <div style={{ background: bg, color: fg }} className={`overflow-hidden rounded-lg border border-line shadow-sm ${preview.device === 'mobile' ? 'w-[220px]' : 'w-full'}`}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${preview.mode === 'dark' ? '#1A3C68' : '#E3E9F1'}` }}>
              <img src={preview.mode === 'dark' ? LOGO_DARK : LOGO_LIGHT} alt="" className="h-6 w-auto" />
              <span style={{ background: colors.yellow, color: colors.navy }} className="rounded-full px-3 py-1 text-[10px] font-bold">Book</span>
            </div>
            <div className="px-4 py-6">
              <p className="font-display text-lg font-extrabold leading-tight">Discover Iceland. Travel Comfortably.</p>
              <p className="mt-2 text-[11px] opacity-75">Airport transfers, private tours and drivers.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span style={{ background: colors.yellow, color: colors.navy }} className="rounded-full px-3 py-1.5 text-[11px] font-bold">Book Your Ride</span>
                <span style={{ background: colors.mint, color: colors.navy }} className="rounded-full px-3 py-1.5 text-[11px] font-bold">WhatsApp</span>
              </div>
              <p className="mt-4 text-[11px] font-semibold underline decoration-2 underline-offset-2" style={{ color: preview.mode === 'dark' ? colors.cyan : colors.navy, textDecorationColor: colors.cyan }}>Explore our services</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
