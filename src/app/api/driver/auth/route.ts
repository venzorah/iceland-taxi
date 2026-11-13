import { z } from 'zod'
import { cookies } from 'next/headers'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { DEMO_DRIVER_EMAIL, DEMO_DRIVER_ID, DRIVER_COOKIE, STAFF_COOKIE } from '@/lib/auth/demo'
import { verifyPassword } from '@/lib/auth/password'

const schema = z.object({
  email: z.string().email().optional(),
  driverId: z.string().optional(),
  password: z.string().optional(),
})

/** Demo driver login. Sets an httpOnly cookie. Not production auth. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Provide email or driverId')
  const jar = await cookies()

  if (!process.env.DATABASE_URL) {
    if (parsed.data.email?.toLowerCase() !== DEMO_DRIVER_EMAIL) {
      return jsonError(404, 'NOT_FOUND', `Driver not found. Try ${DEMO_DRIVER_EMAIL}`)
    }
    jar.delete(STAFF_COOKIE)
    jar.set(DRIVER_COOKIE, DEMO_DRIVER_ID, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 14,
    })
    return jsonOk({
      ok: true,
      demo: true,
      driver: { id: DEMO_DRIVER_ID, displayName: 'Ari Þ.', status: 'Available', email: DEMO_DRIVER_EMAIL, vehicle: null },
    })
  }

  const driver = parsed.data.driverId
    ? await prisma.driver.findUnique({
        where: { id: parsed.data.driverId },
        include: { user: true, vehicle: true },
      })
    : await prisma.driver.findFirst({
        where: { user: { email: { equals: parsed.data.email, mode: 'insensitive' } } },
        include: { user: true, vehicle: true },
      })

  if (!driver) return jsonError(404, 'NOT_FOUND', `Driver not found. Try ${DEMO_DRIVER_EMAIL}`)
  if (!driver.active) return jsonError(403, 'SUSPENDED', 'This driver account is suspended.')
  if (driver.user.passwordHash) {
    const password = parsed.data.password || ''
    if (!(await verifyPassword(password, driver.user.passwordHash))) {
      return jsonError(401, 'UNAUTHORIZED', 'Email or password is wrong.')
    }
  }

  jar.delete(STAFF_COOKIE)
  jar.set(DRIVER_COOKIE, driver.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  })

  return jsonOk({
    ok: true,
    demo: true,
    driver: {
      id: driver.id,
      displayName: driver.displayName,
      status: driver.status,
      email: driver.user.email,
      vehicle: driver.vehicle,
    },
  })
}

export async function DELETE() {
  const jar = await cookies()
  jar.delete(DRIVER_COOKIE)
  return jsonOk({ ok: true })
}
