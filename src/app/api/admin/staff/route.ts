import { Role } from '@prisma/client'
import { z } from 'zod'

import { STAFF_ROLES } from '@/lib/admin/content'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  BOOKING_MANAGER: 'Booking Manager',
  FINANCE_MANAGER: 'Finance Manager',
  CONTENT_MANAGER: 'Content Manager',
  STAFF: 'Staff',
}

function present(user: {
  id: string
  email: string
  name: string | null
  role: string
  staffProfile: { title: string | null; active: boolean } | null
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || 'Staff',
    role: user.role,
    roleLabel: ROLE_LABEL[user.role] || user.role,
    title: user.staffProfile?.title || null,
    active: user.staffProfile?.active ?? true,
  }
}

async function handleGET() {
  const blocked = await rejectDriverOnly('staff')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'Database connection required.')
  const users = await prisma.user.findMany({
    where: { role: { in: [...STAFF_ROLES] } },
    include: { staffProfile: true },
    orderBy: { createdAt: 'asc' },
  })
  return jsonOk({ ok: true, source: 'database', staff: users.map(present) })
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(STAFF_ROLES),
})

async function handlePOST(req: Request) {
  const blocked = await rejectDriverOnly('staff')
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter a name, email and role.')
  const email = parsed.data.email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return jsonError(409, 'CONFLICT', 'That email is already used.')
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      role: parsed.data.role as Role,
      staffProfile: { create: { title: ROLE_LABEL[parsed.data.role], active: true } },
    },
    include: { staffProfile: true },
  })
  try {
    const { notifyAccountCreated } = await import('@/lib/email/notices')
    await notifyAccountCreated(user)
  } catch (error) {
    console.error(error)
  }
  return jsonOk({ ok: true, staff: present(user) }, { status: 201 })
}

export const GET = apiHandler(handleGET)
export const POST = apiHandler(handlePOST)
