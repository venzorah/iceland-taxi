'use client'
import { createAuthClient } from 'better-auth/react'
// Same-origin endpoints only. No database URLs, server keys or signing secrets in this client.
export const authClient = createAuthClient()
