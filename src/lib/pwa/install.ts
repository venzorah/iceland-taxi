/** Repeat the install prompt on this cadence while the app is not installed. */
export const INSTALL_PROMPT_INTERVAL_MS = 3 * 60 * 1000

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return ios || window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches
}

export function isIosBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/**
 * Show at most one prompt. Never while the app is already installed, and never
 * again until a fresh install event exists after the previous one was used.
 */
export function canShowInstallPrompt(state: {
  standalone: boolean
  installed: boolean
  visible: boolean
  hasDeferredPrompt: boolean
  promptUsed: boolean
  ios: boolean
}) {
  if (state.standalone || state.installed || state.visible) return false
  if (state.hasDeferredPrompt && !state.promptUsed) return true
  return state.ios
}
