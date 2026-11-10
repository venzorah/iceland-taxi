'use client'

import { useLayoutEffect } from 'react'

const SEEN_KEY = 'itb_welcome_seen'

declare global {
  interface Window {
    __itbWelcome?: number
  }
}

/**
 * First-open splash. The root layout script shows it before paint and stores
 * the flag. This effect keeps the splash up for 2 seconds, including through
 * hydration, then removes it. Later visits never add the class.
 */
export function WelcomeSplash() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const el = document.getElementById('itb-splash')
    if (!el) return
    const firstOpen = window.__itbWelcome === 1 || root.classList.contains('itb-welcome')
    if (!firstOpen) {
      el.remove()
      return
    }
    root.classList.add('itb-welcome')
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* private mode still shows the splash once */
    }
    const timer = window.setTimeout(() => {
      root.classList.remove('itb-welcome')
      el.remove()
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div id="itb-splash" className="itb-splash" role="status" aria-label="Welcome">
      <p className="itb-splash-word">Welcome</p>
      <img className="itb-splash-logo" src="/brand/logo-splash-white.png" alt="Iceland Taxi Booking" />
    </div>
  )
}
