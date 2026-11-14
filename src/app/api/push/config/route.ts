import { apiHandler, jsonOk } from '@/lib/api'
import { vapidConfig } from '@/lib/push/vapid'

/** Public VAPID key only. Private key never leaves the server. */
async function handleGET() {
  const vapid = vapidConfig()
  return jsonOk({
    ok: true,
    enabled: vapid.enabled,
    publicKey: vapid.enabled ? vapid.publicKey : null,
    note: vapid.enabled
      ? 'Background push is configured.'
      : 'Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT for alerts when the app is closed. Sound and notifications still work while the site is open.',
  })
}

export const GET = apiHandler(handleGET)
