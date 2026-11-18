import { cache } from 'react'
import { headers } from 'next/headers'
import { getSessionCookie } from 'better-auth/cookies'
import type { Prisma } from '@prisma/client'
import { createSingleFlight } from '@/lib/polling/single-flight'
import { prisma } from '@/lib/prisma'
import { ServiceUnavailableError } from '@/lib/api'
import { getAuth } from './server'

export const STAFF_ROLES = ['SUPER_ADMIN','BOOKING_MANAGER','FINANCE_MANAGER','CONTENT_MANAGER','STAFF'] as const
export function isStaffRole(role: string) { return (STAFF_ROLES as readonly string[]).includes(role) }
type Account = Prisma.UserGetPayload<{include:{staffProfile:true}}>
const lookupAccount = createSingleFlight<Account | null>()

/** Identity/session are database-verified; permissions always come from application-owned records. */
export const getCurrentUser = cache(async () => {
  const requestHeaders = await headers()
  if (!getSessionCookie(requestHeaders, { cookiePrefix: 'iceland-taxi' })) return null
  let session
  try { session = await getAuth().api.getSession({ headers: requestHeaders }) }
  catch { throw new ServiceUnavailableError('AUTH_UNAVAILABLE') }
  if (!session?.user.emailVerified) return null
  return lookupAccount(session.user.id, async () => {
    const identity = await prisma.authIdentity.findUnique({ where:{id:session.user.id},include:{appUser:{include:{staffProfile:true}}} })
    if (!identity || identity.disabled || !identity.emailVerified) return null
    const email = identity.email.toLowerCase()
    if (identity.appUser) {
      const existing = identity.appUser
      if(existing.email===email) return existing
      // A verified email change updates only the already-linked business account.
      return prisma.$transaction(async tx => {
        await tx.booking.updateMany({where:{customerId:null,guestEmail:{equals:existing.email,mode:'insensitive'}},data:{customerId:existing.id}})
        await tx.pushSubscription.updateMany({where:{audience:'customer',guestEmail:existing.email},data:{guestEmail:email}})
        return tx.user.update({where:{id:existing.id},data:{email},include:{staffProfile:true}})
      })
    }
    return prisma.$transaction(async tx => {
      const existing = await tx.user.findFirst({where:{email:{equals:email,mode:'insensitive'}},include:{authIdentity:true}})
      // A Supabase-linked record must be imported, never silently reclaimed by a new signup.
      if (existing?.authId || existing?.authIdentity) return null
      const account = existing || await tx.user.create({data:{email,name:identity.name,role:'CUSTOMER'}})
      await tx.authIdentity.update({where:{id:identity.id},data:{appUserId:account.id}})
      return tx.user.findUnique({where:{id:account.id},include:{staffProfile:true}})
    })
  })
})
export async function getStaffUser() {
  const user=await getCurrentUser()
  return user&&isStaffRole(user.role)&&user.staffProfile?.active!==false?user:null
}
