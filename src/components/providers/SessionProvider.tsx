'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { endSession } from '@/lib/auth/sign-out'
import { portalNavigation } from '@/lib/auth/portal-navigation'

type User = { id: string; email: string; name: string | null; role: string }
type Session = { user: User | null; loading: boolean; accountHref: string; signOut: () => Promise<void> }
const Context = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)
  const currentRequest = useRef<AbortController | null>(null)
  const lastSuccess = useRef(0)
  const pathname = usePathname()
  const identitySession = authClient.useSession()
  const cancelPending = useCallback(() => { requestId.current++; currentRequest.current?.abort(); currentRequest.current = null }, [])
  const refresh = useCallback(async (force = false) => {
    if (!force && (currentRequest.current || Date.now() - lastSuccess.current < 15000)) return
    currentRequest.current?.abort()
    const controller = new AbortController()
    currentRequest.current = controller
    const id = ++requestId.current
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store', signal: controller.signal })
      if (!response.ok) return
      const data = await response.json()
      if (id === requestId.current && !controller.signal.aborted) {
        lastSuccess.current = Date.now()
        setUser(previous => {
          const next = data.user || null
          return previous?.id === next?.id && previous?.role === next?.role && previous?.email === next?.email && previous?.name === next?.name ? previous : next
        })
      }
    } catch { /* Preserve an established session during a temporary service outage. */ }
    finally {
      clearTimeout(timeout)
      if (id === requestId.current) { currentRequest.current = null; setLoading(false) }
    }
  }, [])
  useEffect(() => { void refresh() }, [pathname, refresh])
  useEffect(() => {
    const onFocus = () => { void refresh() }
    const onProfile = () => { void refresh(true) }
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('iceland-taxi-auth') : null
    if(channel) channel.onmessage = event => { if(event.data==='signed-out'){cancelPending();lastSuccess.current=0;setUser(null);setLoading(false)} }
    window.addEventListener('itb-profile-updated', onProfile)
    window.addEventListener('focus', onFocus)
    return () => { channel?.close(); window.removeEventListener('focus', onFocus); window.removeEventListener('itb-profile-updated', onProfile); cancelPending() }
  }, [refresh, cancelPending])
  useEffect(() => {
    if(identitySession.isPending || identitySession.error) return
    if(!identitySession.data){ cancelPending(); lastSuccess.current=0; setUser(null); setLoading(false) }
    else void refresh(true)
  }, [identitySession.data, identitySession.isPending, identitySession.error, refresh, cancelPending])
  async function signOut() {
    await endSession()
    cancelPending(); setUser(null)
    window.location.assign('/')
  }
  const accountHref = portalNavigation(user?.role).href
  return <Context.Provider value={{ user, loading, accountHref, signOut }}>{children}</Context.Provider>
}
export function useSiteSession() {
  const session = useContext(Context)
  if (!session) throw new Error('SessionProvider is required')
  return session
}
