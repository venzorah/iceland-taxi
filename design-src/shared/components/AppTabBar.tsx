import React from 'react'
import type { LucideIcon } from 'lucide-react'

export type AppTab = {
  id: string
  label: string
  icon: LucideIcon
  onSelect?: () => void
  href?: string
  badge?: number
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
      className={`pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pt-1.5 backdrop-blur ${hideFrom === 'lg' ? 'lg:hidden' : 'md:hidden'}`}
    >
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => {
          const on = active === t.id
          const Icon = t.icon
          const inner = t.primary ? (
            <>
              <span className="grid h-10 w-14 place-items-center rounded-full bg-primary text-on-primary">
                <Icon size={20} strokeWidth={2.4} />
              </span>
              <span className="text-[11px] font-semibold text-heading">{t.label}</span>
            </>
          ) : (
            <>
              <span className="relative grid h-10 place-items-center">
                <Icon size={22} strokeWidth={on ? 2.4 : 1.9} className={on ? 'text-heading' : 'text-muted'} />
                {!!t.badge && (
                  <span className="absolute -right-2.5 top-0.5 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-[18px] text-on-primary">{t.badge}</span>
                )}
              </span>
              <span className={`whitespace-nowrap text-[11px] ${on ? 'font-bold text-heading' : 'font-medium text-muted'}`}>{t.label}</span>
            </>
          )
          const cls = 'flex w-full flex-col items-center gap-0.5 transition-transform duration-100 ease-out active:scale-[0.94]'
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
