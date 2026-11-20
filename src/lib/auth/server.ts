import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@/lib/prisma'
import { configuredAppUrl } from '@/lib/app-url'
import { sendMail } from '@/lib/email/mailer'
import { authenticationEmail } from '@/lib/email/templates'
import { createAuthentication } from './config'

let instance: ReturnType<typeof createAuthentication> | undefined

export function getAuth() {
  if (instance) return instance
  const secret = process.env.BETTER_AUTH_SECRET
  const value = configuredAppUrl()
  if (!value || !secret || secret.length < 32) throw new Error('Authentication configuration is required')
  const url = new URL(value)
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname)))) {
    throw new Error('Authentication origin is invalid')
  }
  const proxyHeader = process.env.RATE_LIMIT_PROXY_HEADER
  instance = createAuthentication({
    database: prismaAdapter(prisma, { provider: 'postgresql', transaction: true }),
    baseURL: url.origin,
    secret,
    proxyHeader: ['x-real-ip','cf-connecting-ip'].includes(proxyHeader || '') ? proxyHeader : undefined,
    isDisabled: async id => {
      const identity = await prisma.authIdentity.findUnique({ where: { id }, select: { disabled: true } })
      return !identity || identity.disabled
    },
    canSelfRegister: async email => {
      const reserved = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { role: true } })
      return !reserved || reserved.role === 'CUSTOMER'
    },
    sendLink: async (to, subject, link) => {
      const destination = new URL(link)
      if (destination.origin !== url.origin) throw new Error('Invalid authentication link')
      const result = await sendMail({ to, subject, ...authenticationEmail(subject, link) })
      if (!result.ok) throw new Error('Authentication email delivery is unavailable')
    },
  })
  return instance
}
