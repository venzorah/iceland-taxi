import React, { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * A native-style sheet that slides up from the bottom of the screen. Drag it down or tap the
 * backdrop to dismiss. Fixed to the viewport, so it works from any page.
 */
export function BottomSheet({ open, onClose, title, children, hideFrom }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; hideFrom?: 'md' | 'lg' | 'xl' }) {
  const reduce = useReducedMotion()
  const hide = hideFrom === 'md' ? 'md:hidden' : hideFrom === 'lg' ? 'lg:hidden' : hideFrom === 'xl' ? 'xl:hidden' : ''

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-[60] ${hide}`}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="absolute inset-0 bg-navy/55"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            drag={reduce ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 500) onClose()
            }}
            className="pb-safe absolute inset-x-0 bottom-0 mx-auto flex max-h-[88%] max-w-lg flex-col rounded-t-3xl bg-bg font-sans text-text shadow-2xl"
          >
            <div className="shrink-0 cursor-grab px-5 pt-3 active:cursor-grabbing">
              <div className="mx-auto h-1 w-10 rounded-full bg-input-line" />
              {title && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-bold text-heading">{title}</h2>
                  <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-surface text-heading">
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-3">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
