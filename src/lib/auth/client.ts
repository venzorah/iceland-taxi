'use client'
import { createAuthClient } from 'better-auth/react'
import { emailOTPClient } from 'better-auth/client/plugins'
// Same-origin endpoints only. No database URLs, server keys or signing secrets in this client.
export const authClient = createAuthClient({ plugins: [emailOTPClient()] })
