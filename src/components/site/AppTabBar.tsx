'use client'

import React from 'react'
import type { LucideIcon } from 'lucide-react'

export type AppTab = {
  id: string
  label: string
  icon: LucideIcon
  onSelect?: () => void
  href?: string
  badge?: number
  /** Signed-in marker. Does not show a count. */
  dot?: boolean
  primary?: boolean
}

/**
 * A phone-style bottom tab bar. Fixed to the bottom of the viewport and hidden from `hideFrom` up,
 * so desktop keeps its own navigation.
 */
export function AppTabBar({ tabs, active, hideFrom = 'md' }: { tabs: AppTab[]; active?: string; hideFrom?: 'md' | 'lg' }) {
  return (
    <nav
      aria-label="App navigation"
      className={`pb-safe fixed inset-x-0 bottom-0 z-40 w-full max-w-full overflow-x-clip border-t border-line bg-white pt-1.5 dark:bg-bg ${hideFrom === 'lg' ? 'lg:hidden' : 'md:hidden'}`}
    >
      <ul className="grid w-full min-w-0" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => {
          const on = active === t.id
          const Icon = t.icon
          const inner = t.primary ? (
            <>
              <span className="grid h-10 w-14 place-items-center rounded-full bg-primary text-on-primary">
                <Icon size={20} strokeWidth={2.4} />
              </span>
              <span className="max-w-full truncate text-[11px] font-semibold leading-tight text-heading">{t.label}</span>
            </>
          ) : (
            <>
              <span className="relative grid h-10 place-items-center">
                <Icon size={22} strokeWidth={on ? 2.4 : 1.9} className={on ? 'text-heading' : 'text-muted'} />
                {!!t.badge && (
                  <span className="absolute right-1 top-0.5 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-[18px] text-on-primary">{t.badge}</span>
                )}
                {t.dot && !t.badge && <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-mint" />}
              </span>
              <span className={`max-w-full truncate px-0.5 text-[11px] leading-tight ${on ? 'font-bold text-heading' : 'font-medium text-muted'}`}>{t.label}</span>
            </>
          )
          const cls = 'flex min-h-11 w-full min-w-0 flex-col items-center gap-0.5 overflow-hidden px-0.5 pb-1 transition-transform duration-100 ease-out active:scale-[0.94]'
          return (
            <li key={t.id}>
              {t.href ? (
                <a href={t.href} className={cls} aria-current={on ? 'page' : undefined}>{inner}</a>
              ) : (
                <button type="button" onClick={t.onSelect} className={cls} aria-current={on ? 'page' : undefined}>{inner}</button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
