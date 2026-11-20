import { randomBytes, randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { HttpError } from '@/lib/security/http'
import { sendMail } from '@/lib/email/mailer'
import { driverLoginEmail } from '@/lib/email/templates'
import { hashAccountPassword } from './password'

type Dependencies = { db: PrismaClient; send: typeof sendMail; hash: typeof hashAccountPassword }
const defaults: Dependencies = { db: prisma, send: sendMail, hash: hashAccountPassword }
export type DriverInput = { displayName: string; email: string; phone?: string | null; licenceNotes?: string | null; vehicleId?: string | null; status?: string; active?: boolean }

/** Initial passwords exist only in memory and the recipient's email, never in API responses or notices. */
export const generateDriverPassword = () => randomBytes(18).toString('base64url')

async function attachLogin(tx: Prisma.TransactionClient, user: { id: string; authId: string | null; email: string; name: string | null }, passwordHash: string, kind: string) {
  const pending = await tx.emailNotice.findFirst({ where: { dedupeKey: { startsWith: `${user.id}:driver.login:` }, status: 'sending', createdAt: { gt: new Date(Date.now() - 60_000) } } })
  if (pending) throw new HttpError(409, 'INVITATION_SENDING', 'A login email is already being sent. Wait a moment before retrying.')
  const prior = await tx.authIdentity.findFirst({ where: { OR: [{ appUserId: user.id }, { email: { equals: user.email, mode: 'insensitive' } }] } })
  if (prior && ((prior.appUserId && prior.appUserId !== user.id) || prior.email.toLowerCase() !== user.email.toLowerCase())) throw new HttpError(409, 'IDENTITY_CONFLICT', 'The existing login belongs to a different account. Contact your administrator.')
  const identity = prior
    ? await tx.authIdentity.update({ where: { id: prior.id }, data: { appUserId: user.id, emailVerified: true, disabled: false } })
    : await tx.authIdentity.create({ data: { id: user.authId || randomUUID(), email: user.email, name: user.name || 'Driver', appUserId: user.id, emailVerified: true } })
  const credential = await tx.authAccount.findFirst({ where: { userId: identity.id, providerId: 'credential' } })
  if (credential) await tx.authAccount.update({ where: { id: credential.id }, data: { password: passwordHash } })
  else await tx.authAccount.create({ data: { id: randomUUID(), accountId: identity.id, userId: identity.id, providerId: 'credential', password: passwordHash } })
  await tx.authSession.deleteMany({ where: { userId: identity.id } })
  await tx.authVerification.deleteMany({ where: { identifier: { startsWith: 'reset-password:' }, value: identity.id } })
  return tx.emailNotice.create({ data: { dedupeKey: `${user.id}:driver.login:${randomUUID()}`, kind, toEmail: user.email, subject: 'Your Iceland Taxi driver sign-in details', status: 'sending' } })
}

async function deliverLogin(deps: Dependencies, noticeId: string, user: { email: string; name: string | null }, password: string) {
  const email = driverLoginEmail({ email: user.email, name: user.name || 'Driver', password })
  let result: Awaited<ReturnType<typeof sendMail>>
  try { result = await deps.send({ to: user.email, subject: 'Your Iceland Taxi driver sign-in details', ...email }) }
  catch { result = { ok: false, message: 'Email delivery could not be confirmed.' } }
  await deps.db.emailNotice.update({ where: { id: noticeId }, data: { status: result.ok ? 'sent' : 'failed', error: result.ok ? null : 'Login email delivery could not be confirmed. Retry from Drivers.', sentAt: result.ok ? new Date() : null } })
  return { sent: result.ok }
}

export async function createDriverAccount(input: DriverInput, deps: Dependencies = defaults) {
  // Validate the email template/origin before any database mutation.
  const password = generateDriverPassword()
  driverLoginEmail({ name: input.displayName, email: input.email, password })
  const passwordHash = await deps.hash(password)
  const created = await deps.db.$transaction(async tx => {
    const email = input.email.trim().toLowerCase()
    if (await tx.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } }) || await tx.authIdentity.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })) throw new HttpError(409, 'CONFLICT', 'That email is already used. Existing accounts were not changed.')
    const active = input.active !== false && input.status !== 'Suspended'
    const user = await tx.user.create({ data: { email, name: input.displayName, phone: input.phone || null, role: 'DRIVER', driver: { create: { displayName: input.displayName, licenceNotes: input.licenceNotes || null, vehicleId: input.vehicleId || null, status: active ? input.status || 'Available' : 'Suspended', active } } }, include: { driver: true } })
    const notice = await attachLogin(tx, user, passwordHash, 'driver.login.created')
    return { user, notice }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 })
  const delivery = await deliverLogin(deps, created.notice.id, created.user, password)
  return { driver: created.user.driver, delivery }
}

/** Explicit admin action: rotate credentials, revoke sessions, then email the new initial password. */
export async function emailDriverLogin(driverId: string, deps: Dependencies = defaults) {
  const password = generateDriverPassword()
  const passwordHash = await deps.hash(password)
  const issued = await deps.db.$transaction(async tx => {
    const driver = await tx.driver.findUnique({ where: { id: driverId }, include: { user: true } })
    if (!driver || driver.user.role !== 'DRIVER') throw new HttpError(404, 'NOT_FOUND', 'Driver not found.')
    if (!driver.active) throw new HttpError(409, 'DRIVER_INACTIVE', 'Activate the driver before sending new login details.')
    driverLoginEmail({ name: driver.user.name || 'Driver', email: driver.user.email, password })
    const notice = await attachLogin(tx, driver.user, passwordHash, 'driver.login.issued')
    return { user: driver.user, notice }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 })
  return { delivery: await deliverLogin(deps, issued.notice.id, issued.user, password) }
}
