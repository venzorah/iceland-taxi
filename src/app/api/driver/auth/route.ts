import { z } from 'zod'
import { cookies } from 'next/headers'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { DRIVER_COOKIE } from '@/lib/auth/demo'

const schema = z.object({
  email: z.string().email().optional(),
  driverId: z.string().optional(),
})

/** Demo driver login — sets httpOnly cookie. Not production auth. */
export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Provide email or driverId')

  const driver = parsed.data.driverId
    ? await prisma.driver.findUnique({
        where: { id: parsed.data.driverId },
        include: { user: true, vehicle: true },
      })
    : await prisma.driver.findFirst({
        where: { user: { email: { equals: parsed.data.email, mode: 'insensitive' } } },
        include: { user: true, vehicle: true },
      })

  if (!driver) return jsonError(404, 'NOT_FOUND', 'Driver not found. Try ari.driver@example.local')

  const jar = await cookies()
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
