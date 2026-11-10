import { getServerEnv, integrationConfigured } from '@/lib/env'

export type MapsClientConfig =
  | { configured: true; apiKey: string }
  | { configured: false; reason: string }

export function getGoogleMapsConfig(): MapsClientConfig {
  if (!integrationConfigured('google_maps')) {
    return {
      configured: false,
      reason: 'GOOGLE_MAPS_API_KEY is not set. Maps features are disabled until credentials are provided.',
    }
  }
  return { configured: true, apiKey: getServerEnv().GOOGLE_MAPS_API_KEY! }
}

/** Server-side Places/Directions stubs — fail clearly when unset. */
export async function geocodeAddress(address: string) {
  const cfg = getGoogleMapsConfig()
  if (!cfg.configured) {
    return { ok: false as const, code: 'MISSING_CREDENTIALS' as const, message: cfg.reason }
  }
  return {
    ok: false as const,
    code: 'NOT_IMPLEMENTED' as const,
    message: `Google Maps geocode stub ready for "${address}" once Places API client is wired.`,
  }
}
