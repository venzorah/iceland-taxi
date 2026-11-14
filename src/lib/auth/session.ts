import { cache } from 'react'
import { createHash } from 'node:crypto'
import type { User as AuthUser } from '@supabase/supabase-js'
import type { Prisma } from '@prisma/client'
import { createSingleFlight } from '@/lib/polling/single-flight'
import { prisma } from '@/lib/prisma'
import { ServiceUnavailableError } from '@/lib/api'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const STAFF_ROLES = ['SUPER_ADMIN', 'BOOKING_MANAGER', 'FINANCE_MANAGER', 'CONTENT_MANAGER', 'STAFF'] as const
export function isStaffRole(role: string) {
  return (STAFF_ROLES as readonly string[]).includes(role)
}

type Account = Prisma.UserGetPayload<{ include: { staffProfile: true } }>
const lookupAccount = createSingleFlight<Account | null>()
const verifyIdentity = createSingleFlight<AuthUser | null>()

/** Identity comes only from Supabase verification; roles come only from our database. */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient()
  // Read a token only to verify it. Session contents never establish identity or role.
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError && (!sessionError.status || sessionError.status >= 500)) throw new ServiceUnavailableError('AUTH_UNAVAILABLE')
  if (!session?.access_token) return null
  const fingerprint = createHash('sha256').update(session.access_token).digest('hex')
  const user = await verifyIdentity(fingerprint, async () => {
    const { data: { user }, error } = await supabase.auth.getUser(session.access_token)
    if (error && (!error.status || error.status >= 500) && error.name !== 'AuthSessionMissingError') throw new ServiceUnavailableError('AUTH_UNAVAILABLE')
    return error || !user?.email_confirmed_at ? null : user
  })
  if (!user?.email) return null
  const email = user.email.toLowerCase()
  return lookupAccount(user.id, async () => {
  // This hot path needs account and staff status together. One parameterized join
  // avoids a second database round trip for every session and alert request.
  const [existing] = await prisma.$queryRaw<Account[]>`
    SELECT u.*, row_to_json(s) AS "staffProfile"
    FROM "User" u
    LEFT JOIN "StaffProfile" s ON s."userId" = u.id
    WHERE u."authId" = ${user.id}::uuid
    LIMIT 1
  `
  if (existing) {
    if (existing.email === email) return existing
    // Only a verified change on the same Supabase identity can change this account's email.
    return prisma.$transaction(async tx => {
      await tx.booking.updateMany({ where: { customerId: null, guestEmail: { equals: existing.email, mode: 'insensitive' } }, data: { customerId: existing.id } })
      await tx.pushSubscription.updateMany({ where: { audience: 'customer', guestEmail: existing.email }, data: { guestEmail: email } })
      return tx.user.update({ where: { id: existing.id }, data: { email }, include: { staffProfile: true } })
    })
  }
  // A verified email can claim a pre-provisioned account. No client-supplied roles.
  const byEmail = await prisma.user.findUnique({ where: { email } })
  if (byEmail?.authId && byEmail.authId !== user.id) return null
  return prisma.user.upsert({
    where: { email },
    update: { authId: user.id },
    create: { email, authId: user.id, role: 'CUSTOMER', name: user.user_metadata?.name || null },
    include: { staffProfile: true },
  })
  })
})

export async function getStaffUser() {
  const user = await getCurrentUser()
  return user && isStaffRole(user.role) && user.staffProfile?.active !== false ? user : null
}
