'use client'

const ARMED_KEY = 'itb-alerts-armed'
const ENABLED_KEY = 'itb-alerts-enabled'
const AUDIENCE_KEY = 'itb-alert-as'
const SOUND_URL = '/sounds/message.wav'

let audio: HTMLAudioElement | null = null

export function alertsArmed() {
  return typeof window !== 'undefined' && sessionStorage.getItem(ARMED_KEY) === '1'
}

export function alertsEnabled() {
  return typeof window !== 'undefined' && localStorage.getItem(ENABLED_KEY) === '1'
}

export function rememberAlertAudience(audience: 'staff' | 'customer' | 'driver') {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(AUDIENCE_KEY, audience)
}

export function alertAudience() {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(AUDIENCE_KEY)
}

/** Call from a click or key press so later sounds are allowed to play. */
export function armMessageSound(opts?: { audible?: boolean }) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ARMED_KEY, '1')
  if (!audio) {
    audio = new Audio(SOUND_URL)
    audio.preload = 'auto'
  }
  audio.volume = opts?.audible ? 1 : 0.01
  audio.currentTime = 0
  const started = audio.play()
  if (!opts?.audible) {
    void started
      ?.then(() => {
        audio?.pause()
        if (audio) {
          audio.currentTime = 0
          audio.volume = 1
        }
      })
      .catch(() => {})
  }
}

export function playMessageSound() {
  if (!alertsArmed()) return
  if (!audio) {
    audio = new Audio(SOUND_URL)
    audio.preload = 'auto'
  }
  audio.volume = 1
  audio.currentTime = 0
  void audio.play().catch(() => {})
}

export function markAlertsEnabled() {
  localStorage.setItem(ENABLED_KEY, '1')
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

export async function registerMessageWorker() {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

export async function subscribeToPush() {
  const reg = await registerMessageWorker()
  if (!reg || !('pushManager' in reg)) return { ok: false as const, reason: 'Push is not available in this browser' }
  const config = await fetch('/api/push/config').then((r) => r.json())
  if (!config.enabled || !config.publicKey) {
    return { ok: false as const, reason: config.note || 'Background push is not configured' }
  }
  const existing = await reg.pushManager.getSubscription()
  const sub =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    }))
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    return { ok: false as const, reason: 'The browser did not return a push subscription' }
  }
  const saved = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  })
  const data = await saved.json()
  if (!saved.ok || !data.ok) return { ok: false as const, reason: data.message || 'Could not save the push subscription' }
  return { ok: true as const }
}

export async function showPhoneNotification(item: { id: string; title: string; body: string; url: string }) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return
  const options = {
    body: item.body,
    icon: '/brand/logo-dark-white-text.png',
    tag: `message-${item.id}`,
    renotify: true,
    silent: false,
    sound: SOUND_URL,
    data: { url: item.url },
  } as NotificationOptions
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(item.title, options)
      return
    }
  } catch {
    /* fall through to the page Notification constructor */
  }
  const note = new Notification(item.title, { body: item.body, icon: '/brand/logo-dark-white-text.png', tag: options.tag })
  note.onclick = () => {
    window.focus()
    window.location.href = item.url
  }
}
