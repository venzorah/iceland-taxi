import React from 'react'

import { BAR_STYLES, loopSeconds, visibleAnnouncements, type AnnouncementState } from '@/lib/design/announcements'
import type { Lang } from '@/lib/design/i18n'

type Props = {
  state: AnnouncementState
  language?: Lang
}

/**
 * The scrolling strip above the site menu. Content, colour, speed and on/off
 * all come from Admin → Announcements. Renders nothing when there is nothing live.
 */
export function AnnouncementBar({ state, language = 'en' }: Props) {
  const items = visibleAnnouncements(state)
  if (!items.length) return null

  const s = BAR_STYLES[state.settings.style]
  const textOf = (text: string, textIs: string) => (language === 'is' && textIs ? textIs : text)
  const chars = items.reduce((n, a) => n + textOf(a.text, a.textIs).length + a.linkLabel.length + 8, 0)
  const seconds = loopSeconds(chars, state.settings.speed)
  // Phones only. 80% of the desktop loop is a little faster (homepage seed: 15s → 12s).
  const mobileSeconds = Math.max(6, Math.round(seconds * 0.8))

  const copy = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex min-w-full shrink-0 items-center justify-around">
      {items.map((a) => (
        <li key={a.id} className="flex shrink-0 items-center gap-2 whitespace-nowrap px-6 text-[13px] font-medium">
          <span className={`h-1 w-1 shrink-0 rounded-full ${s.dot}`} />
          <span>{textOf(a.text, a.textIs)}</span>
          {a.linkLabel && a.linkUrl && a.linkUrl !== '#' && (
            <a href={a.linkUrl} tabIndex={hidden ? -1 : undefined} className={`font-bold underline-offset-2 hover:underline ${s.link}`}>
              {a.linkLabel} →
            </a>
          )}
        </li>
      ))}
    </ul>
  )

  return (
    <div
      role="region"
      aria-label="Announcements"
      className={`itb-marquee no-scrollbar relative flex h-9 w-full min-w-0 max-w-full items-center overflow-hidden ${s.bar}`}
    >
      <style>{MARQUEE_CSS}</style>
      <div
        className="itb-marquee-track flex w-max min-w-full max-w-none"
        data-pause={state.settings.pauseOnHover ? 'true' : 'false'}
        style={{
          ['--itb-loop' as string]: `${seconds}s`,
          ['--itb-loop-mobile' as string]: `${mobileSeconds}s`,
        }}
      >
        {copy(false)}
        {copy(true)}
      </div>
    </div>
  )
}

const MARQUEE_CSS = `
@keyframes itb-marquee { from { transform: translate3d(0,0,0) } to { transform: translate3d(-50%,0,0) } }
.itb-marquee { max-width: 100%; }
.itb-marquee-track { animation: itb-marquee var(--itb-loop, 30s) linear infinite; will-change: transform; }
@media (max-width: 767px) {
  .itb-marquee-track { animation-duration: var(--itb-loop-mobile, var(--itb-loop, 30s)); }
}
.itb-marquee:hover .itb-marquee-track[data-pause="true"],
.itb-marquee:focus-within .itb-marquee-track { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .itb-marquee { overflow-x: auto; }
  .itb-marquee-track { animation: none; }
  .itb-marquee-track > ul[aria-hidden] { display: none; }
}
`
