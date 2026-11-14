'use client'
import { useEffect } from 'react'
import { startPolling, type PollResult } from './scheduler'

export function useLivePolling(task: (signal: AbortSignal) => Promise<PollResult>, enabled = true, intervalMs = 15000) {
  useEffect(() => {
    if (!enabled) return
    const poller = startPolling(task, { intervalMs, active: () => !document.hidden })
    const visible = () => { if (!document.hidden) poller.refresh() }
    document.addEventListener('visibilitychange', visible)
    return () => { poller.stop(); document.removeEventListener('visibilitychange', visible) }
  }, [task, enabled, intervalMs])
}
