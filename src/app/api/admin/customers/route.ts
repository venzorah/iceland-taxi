import { z } from 'zod'

import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  category: z.enum(['INTERNATIONAL', 'RESIDENT']).optional(),
})

const patchSchema = createSchema.partial().extend({ email: z.string().email() })

export async function POST(req: Request) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter the customer name and email.')
  const email = parsed.data.email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return jsonError(409, 'CONFLICT', 'That email is already used.')
  const customer = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      role: 'CUSTOMER',
      category: parsed.data.category || 'INTERNATIONAL',
      preferredCurrency: parsed.data.category === 'RESIDENT' ? 'ISK' : 'EUR',
    },
  })
  try {
    const { notifyAccountCreated } = await import('@/lib/email/notices')
    await notifyAccountCreated(customer)
  } catch (error) {
    console.error(error)
  }
  return jsonOk({ ok: true, customer }, { status: 201 })
}

export async function PATCH(req: Request) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter the customer email.')
  const email = parsed.data.email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing && existing.role !== 'CUSTOMER') return jsonError(409, 'CONFLICT', 'That email belongs to a staff or driver account.')
  const created = !existing
  const category = parsed.data.category || existing?.category || 'INTERNATIONAL'
  const customer = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: parsed.data.name?.trim() || 'Customer',
      role: 'CUSTOMER',
      category,
      preferredCurrency: category === 'RESIDENT' ? 'ISK' : 'EUR',
    },
    update: {
      name: parsed.data.name?.trim(),
      category: parsed.data.category,
      preferredCurrency: parsed.data.category === 'RESIDENT' ? 'ISK' : parsed.data.category === 'INTERNATIONAL' ? 'EUR' : undefined,
    },
  })
  if (created) {
    try {
      const { notifyAccountCreated } = await import('@/lib/email/notices')
      await notifyAccountCreated(customer)
    } catch (error) {
      console.error(error)
    }
  }
  return jsonOk({ ok: true, customer })
}
