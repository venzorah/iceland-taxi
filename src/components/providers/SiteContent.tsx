'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SITE_DEFAULTS, siteImageMap } from '@/lib/content/blocks'

const WhatsAppContext = createContext<string | null>(null)

const SiteContentContext = createContext<Record<string, string>>(SITE_DEFAULTS)

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  useEffect(() => {
    let request: AbortController | undefined
    const load = () => {
      request?.abort(); const controller = new AbortController(); request = controller
      fetch('/api/public/site', { signal: controller.signal, cache: 'no-store' })
        .then(async response => { if (!response.ok) throw new Error('Content unavailable'); return response.json() })
        .then(body => { if (!controller.signal.aborted && body?.ok && body.blocks && typeof body.blocks === 'object') { setOverrides(current => Object.keys(current).length === Object.keys(body.blocks).length && Object.entries(current).every(([key,value]) => body.blocks[key] === value) ? current : body.blocks); setWhatsappNumber(body.whatsappE164 || null) } })
        .catch(() => { /* Keep the current content during a transient failure. */ })
    }
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('itb-site-content') : null
    if (channel) channel.onmessage = load
    const changed = () => { load(); channel?.postMessage('changed') }
    const refreshOnReturn = () => { if (document.visibilityState === 'visible') load() }
    const timer = setInterval(refreshOnReturn, 60000)
    document.addEventListener('visibilitychange', refreshOnReturn)
    load(); window.addEventListener('itb-site-content-updated', changed)
    return () => { request?.abort(); channel?.close(); clearInterval(timer); document.removeEventListener('visibilitychange', refreshOnReturn); window.removeEventListener('itb-site-content-updated', changed) }
  }, [])

  const value = useMemo(() => ({ ...SITE_DEFAULTS, ...overrides }), [overrides])
  return <WhatsAppContext.Provider value={whatsappNumber}><SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider></WhatsAppContext.Provider>
}

export function useSiteBlock(key: string) {
  const blocks = useContext(SiteContentContext)
  return blocks[key] ?? SITE_DEFAULTS[key] ?? ''
}

export function useSiteBlocks() { return useContext(SiteContentContext) }

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

export function useSiteWhatsAppNumber() { return useContext(WhatsAppContext) }
