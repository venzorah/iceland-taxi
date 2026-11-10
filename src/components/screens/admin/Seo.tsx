'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'

const PAGES = [
  { title: 'Keflavík Airport Transfer', slug: 'keflavik-airport-transfer', lang: 'EN · IS', index: true, published: true },
  { title: 'Keflavík Airport to Reykjavík', slug: 'keflavik-airport-to-reykjavik', lang: 'EN · IS', index: true, published: true },
  { title: 'Private Driver Iceland', slug: 'private-driver-iceland', lang: 'EN', index: true, published: true },
  { title: 'Golden Circle Private Tour', slug: 'golden-circle-private-tour', lang: 'EN · IS', index: true, published: true },
  { title: 'Private Chauffeur Iceland', slug: 'private-chauffeur-iceland', lang: 'EN', index: false, published: false },
]

export function Seo() {
  const [sel, setSel] = useState(PAGES[0])
  const [title, setTitle] = useState('Keflavík Airport Transfer to Reykjavík | Private & Fixed Price')
  const [desc, setDesc] = useState('Book a private transfer from Keflavík Airport to Reykjavík or your hotel. Fixed prices in EUR or ISK, flight tracking and meet & greet.')

  return (
    <div className="grid min-h-0 lg:h-full lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px]">
      <div className="min-h-0 p-3 sm:p-6 lg:overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-heading">Landing pages</h2>
          <button className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-on-primary"><Plus size={15} /> New page</button>
        </div>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg">
          {PAGES.map((p) => (
            <li key={p.slug}>
              <button onClick={() => setSel(p)} className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors duration-150 ${sel.slug === p.slug ? 'bg-surface' : 'hover:bg-surface/60'}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-heading">{p.title}</p>
                  <p className="truncate font-mono text-xs text-muted">/en/{p.slug}</p>
                </div>
                <span className="hidden whitespace-nowrap text-xs text-muted sm:inline">{p.lang}</span>
                <span className={`shrink-0 sm:w-20 text-right text-xs font-semibold ${p.published ? 'text-success' : 'text-muted'}`}>{p.published ? 'Published' : 'Draft'}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Sitemap, robots.txt, hreflang and canonical tags are generated from these settings.</p>
      </div>

      <aside className="min-h-0 border-t border-line bg-bg p-4 sm:p-6 lg:overflow-y-auto lg:border-l lg:border-t-0">
        <p className="text-xs font-semibold text-muted">Editing</p>
        <h2 className="font-display text-lg font-bold text-heading">{sel.title}</h2>
        <div className="mt-4 inline-flex rounded-lg border border-line p-0.5 text-xs font-semibold">
          <span className="rounded-md bg-navy px-3 py-1.5 text-white dark:bg-white dark:text-navy">English</span>
          <span className="px-3 py-1.5 text-muted">Íslenska</span>
        </div>
        <label className="mt-5 block">
          <span className="flex justify-between text-xs font-semibold text-muted">SEO title <span className={title.length > 60 ? 'text-error' : ''}>{title.length}/60</span></span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus" />
        </label>
        <label className="mt-4 block">
          <span className="flex justify-between text-xs font-semibold text-muted">Meta description <span className={desc.length > 160 ? 'text-error' : ''}>{desc.length}/160</span></span>
          <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 w-full rounded-lg border border-input-line bg-input px-3 py-2 text-sm text-heading outline-none focus:border-focus" />
        </label>
        <label className="mt-4 block">
          <span className="text-xs font-semibold text-muted">URL slug</span>
          <div className="mt-1 flex rounded-lg border border-input-line bg-input text-sm">
            <span className="border-r border-input-line px-3 py-2 text-muted">/en/</span>
            <input key={sel.slug} defaultValue={sel.slug} className="w-full bg-transparent px-3 py-2 text-heading outline-none" />
          </div>
        </label>
        <div className="mt-4 space-y-2">
          {[['Allow search engines to index', sel.index], ['Published', sel.published]].map(([l, v]) => (
            <label key={String(l)} className="flex items-center justify-between text-sm text-heading">
              {l} <input type="checkbox" key={sel.slug + l} defaultChecked={Boolean(v)} className="h-4 w-4 accent-[var(--mint)]" />
            </label>
          ))}
        </div>

        <p className="mt-6 text-xs font-semibold text-muted">Search preview</p>
        <div className="mt-2 rounded-lg border border-line bg-white p-4">
          <p className="truncate text-xs text-[#4d5156]">icelandtaxibooking.com › en › {sel.slug}</p>
          <p className="mt-1 truncate text-lg text-[#1a0dab]">{title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{desc}</p>
        </div>
        <button className="mt-6 w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">Save page</button>
      </aside>
    </div>
  )
}
