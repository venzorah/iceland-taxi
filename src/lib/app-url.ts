/** Read the server origin at runtime: a PC build must not freeze localhost into cPanel. */
export function configuredAppUrl(environment: Record<string, string | undefined> = process.env) {
  return environment.NEXT_PUBLIC_APP_URL?.trim() || undefined
}
