'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SITE_DEFAULTS, siteImageMap } from '@/lib/content/blocks'

const SiteContentContext = createContext<Record<string, string>>(SITE_DEFAULTS)

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    fetch('/api/public/site')
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled && body?.blocks && typeof body.blocks === 'object') setOverrides(body.blocks)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
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
