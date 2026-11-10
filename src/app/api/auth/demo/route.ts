import { z } from 'zod'
import { cookies } from 'next/headers'
import { jsonError, jsonOk } from '@/lib/api'
import { GUEST_EMAIL_COOKIE, STAFF_COOKIE } from '@/lib/auth/demo'

const schema = z.object({
  role: z.enum(['staff', 'guest', 'clear']),
  email: z.string().email().optional(),
})

/** Demo session helper for staff inbox / guest messaging. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid demo auth payload')
  const jar = await cookies()

  if (parsed.data.role === 'clear') {
    jar.delete(STAFF_COOKIE)
    jar.delete(GUEST_EMAIL_COOKIE)
    return jsonOk({ ok: true, cleared: true })
  }

  if (parsed.data.role === 'staff') {
    jar.set(STAFF_COOKIE, '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 14 })
    return jsonOk({ ok: true, role: 'staff', demo: true })
  }

  if (!parsed.data.email) return jsonError(400, 'VALIDATION_ERROR', 'Guest email required')
  jar.set(GUEST_EMAIL_COOKIE, parsed.data.email.toLowerCase(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return jsonOk({ ok: true, role: 'guest', email: parsed.data.email.toLowerCase(), demo: true })
}

export async function GET() {
  const jar = await cookies()
  return jsonOk({
    ok: true,
    staff: jar.get(STAFF_COOKIE)?.value === '1',
    guestEmail: jar.get(GUEST_EMAIL_COOKIE)?.value || null,
  })
}
