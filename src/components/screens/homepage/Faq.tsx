'use client'

import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'

import { FAQS } from '@/lib/design/data'

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="mt-10 divide-y divide-line border-y border-line">
      {FAQS.map((f, i) => {
        const isOpen = open === i
        return (
          <div key={f.q}>
            <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left" aria-expanded={isOpen}>
              <span className="font-semibold text-heading">{f.q}</span>
              <Plus size={18} className={`shrink-0 text-muted transition-transform duration-200 ease-out ${isOpen ? 'rotate-45' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <p className="pb-5 pr-8 text-sm leading-relaxed text-muted">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
