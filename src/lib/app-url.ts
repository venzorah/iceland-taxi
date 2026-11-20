/** Read the server origin at runtime: a PC build must not freeze localhost into cPanel. */
export function configuredAppUrl(environment: Record<string, string | undefined> = process.env) {
  return environment.NEXT_PUBLIC_APP_URL?.trim() || undefined
}

/** Proxy-facing redirects must use the public origin, not Next.js's loopback listener. */
export function applicationOrigin(requestUrl: string) {
  const configured = configuredAppUrl()
  const url = new URL(configured || requestUrl)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Application origin is invalid')
  }
  return url.origin
}
