'use client'

import React, { useEffect, useRef, useState } from 'react'

import { canShowInstallPrompt, INSTALL_PROMPT_INTERVAL_MS, isIosBrowser, isStandaloneDisplay } from '@/lib/pwa/install'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let promptUsed = false
let installedThisSession = false

export function InstallPrompt() {
  const [open, setOpen] = useState(false)
  const [ios, setIos] = useState(false)
  const openRef = useRef(false)

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    const syncInstalled = () => {
      if (isStandaloneDisplay()) installedThisSession = true
    }
    syncInstalled()
    setIos(isIosBrowser())

    const onPrompt = (event: Event) => {
      if (isStandaloneDisplay()) return
      event.preventDefault()
      deferredPrompt = event as BeforeInstallPromptEvent
      promptUsed = false
      installedThisSession = false
    }
    const onInstalled = () => {
      installedThisSession = true
      promptUsed = true
      deferredPrompt = null
      setOpen(false)
    }
    const media = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)')
    const onMode = () => {
      syncInstalled()
      if (installedThisSession) setOpen(false)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    media.addEventListener('change', onMode)

    const tick = () => {
      const show = canShowInstallPrompt({
        standalone: isStandaloneDisplay(),
        installed: installedThisSession,
        visible: openRef.current,
        hasDeferredPrompt: !!deferredPrompt,
        promptUsed,
        ios: isIosBrowser(),
      })
      if (!show) return
      openRef.current = true
      setOpen(true)
    }
    const timer = window.setInterval(tick, INSTALL_PROMPT_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      media.removeEventListener('change', onMode)
    }
  }, [])

  const dismiss = () => {
    openRef.current = false
    setOpen(false)
  }

  const install = async () => {
    const event = deferredPrompt
    if (!event || promptUsed) {
      setOpen(false)
      return
    }
    promptUsed = true
    deferredPrompt = null
    openRef.current = false
    setOpen(false)
    try {
      await event.prompt()
      const choice = await event.userChoice
      if (choice.outcome === 'accepted') installedThisSession = true
    } catch {
      promptUsed = false
    }
  }

  if (!open) return null

  const native = !!deferredPrompt && !promptUsed

  return (
    <div
      role="dialog"
      aria-label="Install Iceland Taxi Booking"
      className="fixed inset-x-3 z-[45] bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-6 md:left-auto md:right-6 md:w-96"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_12px_40px_rgba(6,27,58,0.16)] dark:bg-bg">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold leading-snug text-heading">Install Iceland Taxi Booking</p>
          <p className="mt-1 text-sm leading-snug text-muted">
            {native || !ios
              ? 'Add the app to this device. You can keep booking from the home screen.'
              : 'In Safari, tap Share, then Add to Home Screen.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {native && (
              <button type="button" onClick={install} className="min-h-11 rounded-full bg-primary px-4 text-sm font-bold text-on-primary">
                Install
              </button>
            )}
            <button type="button" onClick={dismiss} className="min-h-11 rounded-full px-3 text-sm font-semibold text-muted">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
