import { getServerEnv } from '@/lib/env'

export function vapidConfig() {
  const env = getServerEnv()
  const publicKey = env.VAPID_PUBLIC_KEY
  const privateKey = env.VAPID_PRIVATE_KEY
  const subject = env.VAPID_SUBJECT
  const enabled = Boolean(publicKey && privateKey && subject)
  return { enabled, publicKey, privateKey, subject }
}
