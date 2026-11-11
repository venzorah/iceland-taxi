import { BookingStatus, type Role } from '@prisma/client'
import { STAFF_ROLES } from '@/lib/admin/content'
import { prisma } from '@/lib/api'
import { sendMail } from './mailer'
import { reminderLabel } from './schedule'

const APP_NAME = 'Iceland Taxi Booking'
const ICELAND_TIME = 'Atlantic/Reykjavik'

type LoadedBooking = NonNullable<Awaited<ReturnType<typeof loadBooking>>>

const bookingInclude = {
  driver: { include: { user: { select: { email: true, name: true } } } },
  vehicle: true,
} as const

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function money(amount: number, currency: string) {
  if (currency === 'ISK') return `ISK ${Math.round(amount).toLocaleString('en-US')}`
  if (currency === 'EUR') return `€${Math.round(amount).toLocaleString('en-US')}`
  return `${currency} ${Math.round(amount).toLocaleString('en-US')}`
}

function whenLabel(pickupAt: Date | null) {
  if (!pickupAt) return 'Pickup time not set'
  return pickupAt.toLocaleString('en-GB', {
    timeZone: ICELAND_TIME,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function companyContext() {
  const company = await prisma.companySettings.findUnique({ where: { id: 'singleton' } })
  return {
    name: company?.displayName?.trim() || APP_NAME,
    replyTo: company?.email?.trim() || null,
  }
}

async function adminEmails() {
  const [company, staff] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: 'singleton' }, select: { email: true } }),
    prisma.user.findMany({
      where: { role: { in: [...STAFF_ROLES] }, OR: [{ staffProfile: null }, { staffProfile: { active: true } }] },
      select: { email: true },
    }),
  ])
  const emails = new Set<string>()
  if (company?.email?.trim()) emails.add(company.email.trim().toLowerCase())
  for (const person of staff) {
    if (person.email?.trim()) emails.add(person.email.trim().toLowerCase())
  }
  return [...emails]
}

function deliverable(email: string | null | undefined) {
  const value = email?.trim().toLowerCase() || ''
  if (!value || !value.includes('@')) return null
  if (value.endsWith('@example.local')) return null
  return value
}

async function deliver(input: {
  dedupeKey: string
  kind: string
  to: string | null
  subject: string
  text: string
  bookingId?: string | null
  bookingRef?: string | null
}) {
  const to = deliverable(input.to)
  if (!to) return
  const existing = await prisma.emailNotice.findUnique({ where: { dedupeKey: input.dedupeKey } })
  if (existing?.status === 'sent') return
  const company = await companyContext()
  const html = `<div style="font-family:Georgia,serif;color:#102033;line-height:1.5"><p>${escapeHtml(input.text).replace(/\n/g, '<br>')}</p><p style="color:#5c6b7a;font-size:13px">${escapeHtml(company.name)}</p></div>`
  const result = await sendMail({
    to,
    subject: input.subject,
    text: `${input.text}\n\n${company.name}`,
    html,
    replyTo: company.replyTo,
  })
  const data = {
    kind: input.kind,
    toEmail: to,
    subject: input.subject,
    bookingId: input.bookingId || null,
    bookingRef: input.bookingRef || null,
    status: result.ok ? 'sent' : 'failed',
    error: result.ok ? null : result.message,
    sentAt: result.ok ? new Date() : null,
  }
  await prisma.emailNotice.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: { dedupeKey: input.dedupeKey, ...data },
    update: data,
  })
}

function bookingFacts(booking: LoadedBooking) {
  return [
    `Reference: ${booking.ref}`,
    `Trip: ${booking.routeLabel}`,
    `When: ${whenLabel(booking.pickupAt)} (Iceland time)`,
    `Pickup address: ${booking.pickupAddress?.trim() || 'Not added'}`,
    `Passengers: ${booking.passengers}`,
    `Vehicle: ${booking.vehicleLabel || booking.vehicle?.name || 'Not chosen'}`,
    `Driver: ${booking.driver?.displayName || 'Not assigned yet'}`,
    `Price: ${money(booking.amountSnapshot, booking.currency)}`,
  ].join('\n')
}

async function loadBooking(id: string) {
  return prisma.booking.findUnique({ where: { id }, include: bookingInclude })
}

async function sendToParties(booking: LoadedBooking, kind: string, subject: string, intro: string, includeDriver: boolean) {
  const text = `${intro}\n\n${bookingFacts(booking)}`
  const targets: { role: string; email: string | null }[] = [
    { role: 'customer', email: booking.guestEmail },
    ...(includeDriver ? [{ role: 'driver', email: booking.driver?.user.email || null }] : []),
  ]
  const admins = await adminEmails()
  for (const admin of admins) targets.push({ role: 'admin', email: admin })
  const seen = new Set<string>()
  for (const target of targets) {
    const email = deliverable(target.email)
    if (!email || seen.has(email)) continue
    seen.add(email)
    await deliver({
      dedupeKey: `${booking.id}:${kind}:${email}`,
      kind,
      to: email,
      subject,
      text,
      bookingId: booking.id,
      bookingRef: booking.ref,
    })
  }
}

export async function notifyBookingCreated(bookingId: string) {
  const booking = await loadBooking(bookingId)
  if (!booking) return
  await sendToParties(
    booking,
    'booking.created',
    `${APP_NAME} booking ${booking.ref}`,
    `Your booking ${booking.ref} is saved. It stays unpaid until payment is completed.`,
    true,
  )
}

export async function notifyBookingConfirmed(bookingId: string) {
  const booking = await loadBooking(bookingId)
  if (!booking || booking.status !== BookingStatus.CONFIRMED) return
  await sendToParties(
    booking,
    'booking.confirmed',
    `${APP_NAME} payment received ${booking.ref}`,
    `Payment for booking ${booking.ref} is received and the trip is confirmed.`,
    true,
  )
}

export async function notifyBookingUpdated(before: { status: BookingStatus; driverId: string | null }, bookingId: string) {
  const booking = await loadBooking(bookingId)
  if (!booking) return
  if (before.driverId !== booking.driverId && booking.driverId) {
    await sendToParties(
      booking,
      `booking.assigned.${booking.driverId}`,
      `${APP_NAME} driver assigned ${booking.ref}`,
      `${booking.driver?.displayName || 'A driver'} is assigned to booking ${booking.ref}.`,
      true,
    )
  }
  if (before.status === booking.status) return
  if (booking.status === BookingStatus.CANCELLED) {
    await sendToParties(booking, 'booking.cancelled', `${APP_NAME} booking cancelled ${booking.ref}`, `Booking ${booking.ref} is cancelled.`, true)
  } else if (booking.status === BookingStatus.COMPLETED) {
    await sendToParties(booking, 'booking.completed', `${APP_NAME} trip completed ${booking.ref}`, `Booking ${booking.ref} is marked complete.`, true)
  } else if (booking.status === BookingStatus.REFUND_REQUESTED) {
    await sendToParties(booking, 'booking.refund-requested', `${APP_NAME} refund requested ${booking.ref}`, `A refund was requested for booking ${booking.ref}.`, false)
  } else if (booking.status === BookingStatus.REFUNDED) {
    await sendToParties(booking, 'booking.refunded', `${APP_NAME} booking refunded ${booking.ref}`, `Booking ${booking.ref} is marked refunded.`, true)
  } else if (booking.status === BookingStatus.CONFIRMED) {
    await notifyBookingConfirmed(bookingId)
  }
}

export async function notifyBookingDeleted(booking: {
  id: string
  ref: string
  guestEmail: string | null
  routeLabel: string
  pickupAt: Date | null
  driverId: string | null
}) {
  const driver = booking.driverId
    ? await prisma.driver.findUnique({ where: { id: booking.driverId }, include: { user: { select: { email: true } } } })
    : null
  const text = `Booking ${booking.ref} was removed.\n\nTrip: ${booking.routeLabel}\nWhen: ${whenLabel(booking.pickupAt)} (Iceland time)`
  const targets = [booking.guestEmail, driver?.user.email || null, ...(await adminEmails())]
  const seen = new Set<string>()
  for (const target of targets) {
    const email = deliverable(target)
    if (!email || seen.has(email)) continue
    seen.add(email)
    await deliver({
      dedupeKey: `${booking.id}:booking.deleted:${email}`,
      kind: 'booking.deleted',
      to: email,
      subject: `${APP_NAME} booking removed ${booking.ref}`,
      text,
      bookingId: booking.id,
      bookingRef: booking.ref,
    })
  }
}

export async function notifyEnquiryReceived(enquiry: {
  id: string
  name: string
  email: string
  phone: string
  fromLabel: string
  toLabel: string
  tripDate: string
  tripTime: string
  passengers: number
  notes: string | null
}) {
  const text = [
    `Enquiry from ${enquiry.name}. This is not a paid booking.`,
    '',
    `From: ${enquiry.fromLabel}`,
    `To: ${enquiry.toLabel}`,
    `When: ${enquiry.tripDate} ${enquiry.tripTime}`,
    `Passengers: ${enquiry.passengers}`,
    `Phone: ${enquiry.phone}`,
    enquiry.notes ? `Notes: ${enquiry.notes}` : '',
  ].filter(Boolean).join('\n')
  await deliver({
    dedupeKey: `${enquiry.id}:enquiry.customer:${enquiry.email.toLowerCase()}`,
    kind: 'enquiry.received',
    to: enquiry.email,
    subject: `${APP_NAME} enquiry received`,
    text: `We have your enquiry. There is no price to pay until the team publishes a trip.\n\n${text}`,
  })
  for (const admin of await adminEmails()) {
    await deliver({
      dedupeKey: `${enquiry.id}:enquiry.admin:${admin}`,
      kind: 'enquiry.received',
      to: admin,
      subject: `${APP_NAME} new enquiry from ${enquiry.name}`,
      text,
    })
  }
}

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: 'customer',
  DRIVER: 'driver',
  SUPER_ADMIN: 'admin',
  BOOKING_MANAGER: 'admin',
  FINANCE_MANAGER: 'admin',
  CONTENT_MANAGER: 'admin',
  STAFF: 'admin',
}

export async function notifyAccountCreated(user: { id: string; email: string; name: string | null; role: Role | string }) {
  const label = ROLE_LABEL[user.role] || 'account'
  const name = user.name?.trim() || 'there'
  await deliver({
    dedupeKey: `${user.id}:account.created`,
    kind: 'account.created',
    to: user.email,
    subject: `${APP_NAME} ${label} account`,
    text: `Hello ${name}. A ${label} account was created for ${user.email}.`,
  })
  if (user.role === 'CUSTOMER') return
  for (const admin of await adminEmails()) {
    if (admin === user.email.trim().toLowerCase()) continue
    await deliver({
      dedupeKey: `${user.id}:account.created.admin:${admin}`,
      kind: 'account.created',
      to: admin,
      subject: `${APP_NAME} new ${label} account`,
      text: `${user.name?.trim() || user.email} was added as a ${label} (${user.email}).`,
    })
  }
}

export async function notifyTripReminder(bookingId: string, kind: string) {
  const booking = await loadBooking(bookingId)
  if (!booking) return
  const when = reminderLabel(kind)
  await sendToParties(
    booking,
    kind,
    `${APP_NAME} trip in ${when}: ${booking.ref}`,
    `Reminder: booking ${booking.ref} is in ${when}.`,
    true,
  )
}
