import { prisma } from '@/lib/prisma'

export type MessageActor =
  | { kind: 'staff'; userId: string; name?: string | null }
  | { kind: 'customer'; email: string; name?: string | null; userId?: string | null }

export async function listThreads(opts: {
  role: 'staff' | 'customer'
  guestEmail?: string | null
}) {
  if (opts.role === 'customer' && !opts.guestEmail) return []

  const bookings = await prisma.booking.findMany({
    where:
      opts.role === 'staff'
        ? { messages: { some: {} } }
        : {
            guestEmail: { equals: opts.guestEmail!, mode: 'insensitive' },
            messages: { some: {} },
          },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 40 },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  return bookings.map((b) => {
    const last = b.messages[0]
    const unread = b.messages.filter(
      (m) => m.unread && m.authorRole === (opts.role === 'staff' ? 'customer' : 'staff'),
    ).length
    return {
      id: b.id,
      bookingId: b.id,
      ref: b.ref,
      title: `${b.ref} · ${b.serviceLabel}`,
      customer: b.guestName || b.guestEmail || 'Guest',
      preview: last?.body || 'No messages yet',
      time: last
        ? last.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : '',
      unread,
      who: opts.role === 'staff' ? b.guestName || 'Customer' : 'Operations',
    }
  })
}

/** Staff inbox also lists bookings without messages yet (recent ops). */
export async function listStaffInbox() {
  const withMessages = await listThreads({ role: 'staff' })
  if (withMessages.length > 0) return withMessages

  const recent = await prisma.booking.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 20,
  })
  return recent.map((b) => ({
    id: b.id,
    bookingId: b.id,
    ref: b.ref,
    title: `${b.ref} · ${b.serviceLabel}`,
    customer: b.guestName || b.guestEmail || 'Guest',
    preview: 'Start a conversation',
    time: '',
    unread: 0,
    who: b.guestName || 'Customer',
  }))
}

export async function getThreadMessages(bookingRef: string) {
  const booking = await prisma.booking.findUnique({
    where: { ref: bookingRef },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { name: true, email: true, role: true } } },
      },
    },
  })
  if (!booking) return null
  return {
    booking,
    messages: booking.messages.map((m) => ({
      id: m.id,
      body: m.body,
      authorRole: m.authorRole,
      guestName: m.guestName,
      guestEmail: m.guestEmail,
      authorName: m.author?.name || m.guestName || (m.authorRole === 'staff' ? 'Staff' : 'Customer'),
      unread: m.unread,
      channel: m.channel,
      createdAt: m.createdAt.toISOString(),
      time: m.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    })),
  }
}

export async function postMessage(opts: {
  bookingRef: string
  body: string
  actor: MessageActor
}) {
  const booking = await prisma.booking.findUnique({ where: { ref: opts.bookingRef } })
  if (!booking) return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Booking not found' }

  if (opts.actor.kind === 'customer') {
    const email = opts.actor.email.toLowerCase()
    if (!booking.guestEmail || booking.guestEmail.toLowerCase() !== email) {
      return { ok: false as const, code: 'FORBIDDEN' as const, message: 'Email does not match this booking' }
    }
  }

  const message = await prisma.message.create({
    data: {
      bookingId: booking.id,
      body: opts.body.trim(),
      authorId: opts.actor.kind === 'staff' ? opts.actor.userId : opts.actor.userId || undefined,
      authorRole: opts.actor.kind === 'staff' ? 'staff' : 'customer',
      guestEmail: opts.actor.kind === 'customer' ? opts.actor.email : undefined,
      guestName: opts.actor.kind === 'customer' ? opts.actor.name || booking.guestName : undefined,
      channel: 'in_app',
      unread: true,
    },
  })

  await prisma.booking.update({ where: { id: booking.id }, data: { updatedAt: new Date() } })

  const { pushMessageAlert } = await import('@/lib/push/send')
  void pushMessageAlert({
    bookingRef: booking.ref,
    messageId: message.id,
    authorRole: message.authorRole,
    guestEmail: booking.guestEmail,
    driverId: booking.driverId,
  }).catch(() => {})

  return { ok: true as const, message }
}

export type MessageAlertItem = { id: string; bookingRef: string; href: string }

/** Unread alerts for the signed-in surfaces. Ids and booking refs only. */
export async function listMessageAlerts(viewer: {
  staff: boolean
  guestEmail: string | null
  driverId: string | null
}) {
  const roles: string[] = []
  const items = new Map<string, MessageAlertItem>()

  const add = (id: string, bookingRef: string | undefined, href: string) => {
    if (!bookingRef || items.has(id)) return
    items.set(id, { id, bookingRef, href })
  }

  if (viewer.staff) {
    roles.push('staff')
    const rows = await prisma.message.findMany({
      where: { unread: true, authorRole: 'customer', bookingId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, booking: { select: { ref: true } } },
    })
    for (const row of rows) add(row.id, row.booking?.ref, `/messages?ref=${encodeURIComponent(row.booking?.ref || '')}`)
  }

  if (viewer.guestEmail) {
    roles.push('customer')
    const rows = await prisma.message.findMany({
      where: {
        unread: true,
        authorRole: 'staff',
        booking: { guestEmail: { equals: viewer.guestEmail, mode: 'insensitive' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, booking: { select: { ref: true } } },
    })
    for (const row of rows) add(row.id, row.booking?.ref, `/messages?ref=${encodeURIComponent(row.booking?.ref || '')}`)
  }

  if (viewer.driverId) {
    roles.push('driver')
    const rows = await prisma.message.findMany({
      where: { unread: true, booking: { driverId: viewer.driverId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, booking: { select: { ref: true } } },
    })
    for (const row of rows) add(row.id, row.booking?.ref, '/driver')
  }

  return { viewer: roles.join('+') || 'none', items: [...items.values()] }
}

export async function markThreadRead(bookingRef: string, reader: 'staff' | 'customer') {
  const booking = await prisma.booking.findUnique({ where: { ref: bookingRef } })
  if (!booking) return { ok: false as const }
  await prisma.message.updateMany({
    where: {
      bookingId: booking.id,
      unread: true,
      authorRole: reader === 'staff' ? 'customer' : 'staff',
    },
    data: { unread: false },
  })
  return { ok: true as const }
}
