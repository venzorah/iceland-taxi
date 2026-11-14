'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SITE_DEFAULTS, siteImageMap } from '@/lib/content/blocks'

const SiteContentContext = createContext<Record<string, string>>(SITE_DEFAULTS)

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  useEffect(() => {
    let request: AbortController | undefined
    const load = () => {
      request?.abort(); const controller = new AbortController(); request = controller
      fetch('/api/public/site', { signal: controller.signal, cache: 'no-store' })
        .then(async response => { if (!response.ok) throw new Error('Content unavailable'); return response.json() })
        .then(body => { if (!controller.signal.aborted && body?.ok && body.blocks && typeof body.blocks === 'object') setOverrides(body.blocks) })
        .catch(() => { /* Keep the current content during a transient failure. */ })
    }
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('itb-site-content') : null
    if (channel) channel.onmessage = load
    const changed = () => { load(); channel?.postMessage('changed') }
    load(); window.addEventListener('itb-site-content-updated', changed)
    return () => { request?.abort(); channel?.close(); window.removeEventListener('itb-site-content-updated', changed) }
  }, [])

  const value = useMemo(() => ({ ...SITE_DEFAULTS, ...overrides }), [overrides])
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>
}

export function useSiteBlock(key: string) {
  const blocks = useContext(SiteContentContext)
  return blocks[key] ?? SITE_DEFAULTS[key] ?? ''
}

export function useSiteImages() {
  const blocks = useContext(SiteContentContext)
  return siteImageMap(blocks)
}

export function useFaqs() {
  const blocks = useContext(SiteContentContext)
  return [0, 1, 2, 3, 4].map((index) => ({
    q: blocks[`faq.${index}.q`] || SITE_DEFAULTS[`faq.${index}.q`],
    a: blocks[`faq.${index}.a`] || SITE_DEFAULTS[`faq.${index}.a`],
  }))
}
