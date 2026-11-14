import webpush from 'web-push'
import { prisma } from '@/lib/prisma'
import { messageAlertCopy } from '@/lib/alerts/copy'
import { vapidConfig } from './vapid'

type PushTarget = {
  endpoint: string
  p256dh: string
  auth: string
  audience: string
}

/**
 * Best-effort Web Push. Missing VAPID keys skip the send.
 * Payload is title, generic body, and booking ref — never the message text.
 */
export async function pushMessageAlert(input: {
  bookingRef: string
  messageId: string
  authorRole: string
  guestEmail: string | null
  driverId: string | null
  channel?: string
}) {
  const vapid = vapidConfig()
  if (!vapid.enabled || !vapid.publicKey || !vapid.privateKey || !vapid.subject) return { sent: 0, skipped: 'VAPID keys are not set' }

  const subject = vapid.subject.startsWith('mailto:') || vapid.subject.startsWith('https:')
    ? vapid.subject
    : vapid.subject.includes('@')
      ? `mailto:${vapid.subject}`
      : vapid.subject
  webpush.setVapidDetails(subject, vapid.publicKey, vapid.privateKey)

  const or: Array<Record<string, unknown>> = []
  if (input.authorRole === 'customer' || input.authorRole === 'driver') or.push({ audience: 'staff' })
  if (input.authorRole === 'staff' && input.guestEmail) {
    or.push({ audience: 'customer', guestEmail: input.guestEmail.toLowerCase() })
  }
  if (input.driverId && input.channel === 'driver_ops' && input.authorRole === 'staff') {
    or.push({ audience: 'driver', driverId: input.driverId })
  }
  if (or.length === 0) return { sent: 0, skipped: 'no recipients' }

  let subs: PushTarget[] = []
  try {
    subs = await prisma.pushSubscription.findMany({
      where: { OR: or },
      select: { endpoint: true, p256dh: true, auth: true, audience: true },
    })
  } catch {
    return { sent: 0, skipped: 'push subscriptions unavailable' }
  }

  const byEndpoint = new Map<string, PushTarget & { href: string }>()
  for (const sub of subs) {
    const href = sub.audience === 'driver' ? '/driver' : `/messages?ref=${encodeURIComponent(input.bookingRef)}`
    const existing = byEndpoint.get(sub.endpoint)
    if (!existing || existing.href === '/driver') byEndpoint.set(sub.endpoint, { ...sub, href })
  }

  let sent = 0
  for (const sub of byEndpoint.values()) {
    const copy = messageAlertCopy(input.bookingRef, sub.href)
    const payload = JSON.stringify({ ...copy, id: input.messageId })
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
      sent += 1
    } catch (error) {
      const status = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } }).catch(() => {})
      }
    }
  }
  return { sent }
}
