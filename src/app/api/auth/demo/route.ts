import { z } from 'zod'
import { cookies } from 'next/headers'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { DRIVER_COOKIE, GUEST_EMAIL_COOKIE, STAFF_COOKIE } from '@/lib/auth/demo'

const schema = z.object({
  role: z.enum(['staff', 'guest', 'clear', 'logout']),
  email: z.string().email().optional(),
})

/** Seeded booking guest used when the database is not available. */
const SEEDED_GUESTS: Record<string, string> = {
  'emma@example.local': 'Emma Larsen',
}

async function resolveGuest(email: string): Promise<{ email: string; name: string | null } | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  if (!process.env.DATABASE_URL) {
    return SEEDED_GUESTS[normalized] ? { email: normalized, name: SEEDED_GUESTS[normalized] } : null
  }
  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' }, role: 'CUSTOMER' },
      select: { email: true, name: true },
    })
    if (user) return { email: user.email.toLowerCase(), name: user.name }
    const booking = await prisma.booking.findFirst({
      where: { guestEmail: { equals: normalized, mode: 'insensitive' } },
      select: { guestEmail: true, guestName: true },
      orderBy: { createdAt: 'desc' },
    })
    if (booking?.guestEmail) return { email: booking.guestEmail.toLowerCase(), name: booking.guestName }
  } catch (error) {
    console.error(error)
  }
  return SEEDED_GUESTS[normalized] ? { email: normalized, name: SEEDED_GUESTS[normalized] } : null
}

/** Demo session helper for staff inbox / guest messaging. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid demo auth payload')
  const jar = await cookies()

  if (parsed.data.role === 'logout') {
    jar.delete(GUEST_EMAIL_COOKIE)
    return jsonOk({ ok: true, cleared: true })
  }

  if (parsed.data.role === 'clear') {
    jar.delete(STAFF_COOKIE)
    jar.delete(GUEST_EMAIL_COOKIE)
    return jsonOk({ ok: true, cleared: true })
  }

  if (parsed.data.role === 'staff') {
    jar.set(STAFF_COOKIE, '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 14 })
    jar.delete(DRIVER_COOKIE)
    return jsonOk({ ok: true, role: 'staff', demo: true, email: 'admin@example.local' })
  }

  if (!parsed.data.email) return jsonError(400, 'VALIDATION_ERROR', 'Guest email required')
  const guest = await resolveGuest(parsed.data.email)
  if (!guest) return jsonError(404, 'NOT_FOUND', 'No booking uses that email.')
  jar.set(GUEST_EMAIL_COOKIE, guest.email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return jsonOk({ ok: true, role: 'guest', email: guest.email, name: guest.name, demo: true })
}

export async function GET() {
  const jar = await cookies()
  const guestEmail = jar.get(GUEST_EMAIL_COOKIE)?.value || null
  const guest = guestEmail ? await resolveGuest(guestEmail) : null
  return jsonOk({
    ok: true,
    staff: jar.get(STAFF_COOKIE)?.value === '1',
    driver: Boolean(jar.get(DRIVER_COOKIE)?.value),
    guestEmail: guest?.email || guestEmail,
    guestName: guest?.name || null,
  })
}
