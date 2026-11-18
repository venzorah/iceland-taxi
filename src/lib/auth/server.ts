import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@/lib/prisma'
import { configuredAppUrl } from '@/lib/app-url'
import { sendMail } from '@/lib/email/mailer'
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
    sendLink: async (to, subject, link) => {
      const destination = new URL(link)
      if (destination.origin !== url.origin) throw new Error('Invalid authentication link')
      const escape = (text: string) => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!))
      const result = await sendMail({ to, subject, text: `${subject}\n\n${link}\n\nIf you did not request this, contact Iceland Taxi support.`, html: `<p>${escape(subject)}</p><p><a href="${escape(link)}">Continue securely</a></p><p>If you did not request this, contact Iceland Taxi support.</p>` })
      if (!result.ok) throw new Error('Authentication email delivery is unavailable')
    },
  })
  return instance
}
