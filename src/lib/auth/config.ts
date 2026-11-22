import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { APIError } from 'better-auth/api'
import { emailOTP } from 'better-auth/plugins/email-otp'
import { hashAccountPassword, verifyAccountPassword } from './password'

type Configuration = {
  database: BetterAuthOptions['database']
  baseURL: string
  secret: string
  isDisabled: (id: string) => Promise<boolean>
  sendLink: (to: string, subject: string, url: string) => Promise<void>
  sendCode: (to: string, subject: string, code: string, purpose: 'sign-in' | 'email-verification' | 'forget-password' | 'change-email') => Promise<void>
  proxyHeader?: string
  canSelfRegister?: (email: string) => Promise<boolean>
}

/** Shared by the real Prisma server and isolated authentication acceptance checks. */
export function createAuthentication(config: Configuration) {
  return betterAuth({
    appName: 'Iceland Taxi Booking',
    baseURL: config.baseURL,
    basePath: '/api/auth',
    secret: config.secret,
    database: config.database,
    trustedOrigins: [config.baseURL],
    logger: { disabled: true },
    telemetry: { enabled: false },
    user: {
      modelName: 'AuthIdentity',
      additionalFields: {
        appUserId: { type: 'string', required: false, input: false, returned: false },
        disabled: { type: 'boolean', defaultValue: false, input: false, returned: false },
      },
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: false,
        sendChangeEmailConfirmation: async ({ user, url }) => config.sendLink(user.email, 'Approve your Iceland Taxi email change', url),
      },
      deleteUser: { enabled: false },
    },
    account: { modelName: 'AuthAccount', accountLinking: { enabled: false } },
    verification: { modelName: 'AuthVerification' },
    session: {
      modelName: 'AuthSession',
      expiresIn: 7 * 86400,
      updateAge: 86400,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'AuthRateLimit',
      window: 60, max: 120,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 600, max: 5 },
        '/request-password-reset': { window: 600, max: 5 },
        '/send-verification-email': { window: 600, max: 5 },
        '/email-otp/send-verification-otp': { window: 600, max: 5 },
        '/email-otp/verify-email': { window: 600, max: 8 },
        '/email-otp/request-password-reset': { window: 600, max: 5 },
        '/email-otp/reset-password': { window: 600, max: 8 },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      password: { hash: hashAccountPassword, verify: verifyAccountPassword },
      resetPasswordTokenExpiresIn: 3600,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => config.sendLink(user.email, 'Reset your Iceland Taxi password', url),
    },
    emailVerification: {
      expiresIn: 3600,
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: true,
      // The OTP plugin supplies this callback. An explicit link callback overrides it.
      // Keep signup verification on the same six-digit-code flow as the client.
    },
    plugins: [
      emailOTP({
        overrideDefaultEmailVerification: true,
        sendVerificationOnSignUp: true,
        disableSignUp: true,
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 5,
        storeOTP: 'hashed',
        rateLimit: { window: 600, max: 8 },
        sendVerificationOTP: async ({ email, otp, type }) => {
          const subject = type === 'forget-password'
            ? 'Your Iceland Taxi password code'
            : type === 'change-email'
              ? 'Your Iceland Taxi email code'
              : 'Your Iceland Taxi verification code'
          await config.sendCode(email, subject, otp, type)
        },
      }),
    ],
    advanced: {
      cookiePrefix: 'iceland-taxi',
      useSecureCookies: config.baseURL.startsWith('https:'),
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: config.baseURL.startsWith('https:') },
      ipAddress: { ipAddressHeaders: config.proxyHeader ? [config.proxyHeader] : [] },
    },
    databaseHooks: {
      user: { create: { before: async user => {
        if (config.canSelfRegister && !await config.canSelfRegister(user.email.trim().toLowerCase())) {
          throw new APIError('FORBIDDEN', { message: 'This account must be managed by an administrator. Use your emailed sign-in details or contact operations.' })
        }
        return { data: user }
      } } },
      session: { create: { before: async session => {
        if (await config.isDisabled(session.userId)) return false
        return { data: session }
      } } },
    },
  })
}
