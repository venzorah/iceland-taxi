import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { apiHandler, jsonError, jsonOk } from '@/lib/api'
const query = z.object({ latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180) })
type Weather = { temperature: number; condition: string; observedAt: string }
const cache = new Map<string, { data: Weather; expires: number; modified?: string }>()
const expiry = (response: Response) => { const value = Date.parse(response.headers.get('expires') || ''); return Number.isFinite(value) ? value : Date.now() + 15 * 60 * 1000 }
async function handleGET(req: Request) {
  if (!await getCurrentUser()) return jsonError(401, 'UNAUTHORIZED', 'Sign in to view local weather.')
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) return jsonError(400, 'INVALID_LOCATION', 'Valid coordinates are required.')
  const lat = parsed.data.latitude.toFixed(2), lon = parsed.data.longitude.toFixed(2)
  const key = `${lat},${lon}`
  const previous = cache.get(key)
  if (previous && previous.expires > Date.now()) return jsonOk(previous.data)
  try {
    const headers: Record<string, string> = { 'User-Agent': 'IcelandTaxiBooking/1.0 https://icelandtaxibooking.is/' }
    if (previous?.modified) headers['If-Modified-Since'] = previous.modified
    const response = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, { headers, signal: AbortSignal.timeout(10000), cache: 'no-store' })
    if (response.status === 304 && previous) { previous.expires = expiry(response); return jsonOk(previous.data) }
    if (!response.ok) throw new Error('Weather unavailable')
    const data = await response.json()
    const point = data.properties?.timeseries?.[0]
    const temperature = point?.data?.instant?.details?.air_temperature
    if (typeof temperature !== 'number') throw new Error('Invalid weather')
    const symbol = point.data.next_1_hours?.summary?.symbol_code || point.data.next_6_hours?.summary?.symbol_code || ''
    const weather: Weather = { temperature, condition: symbol, observedAt: point.time }
    if (cache.size >= 1000) cache.clear()
    cache.set(key, { data: weather, expires: expiry(response), modified: response.headers.get('last-modified') || undefined })
    return jsonOk(weather, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return jsonError(503, 'WEATHER_UNAVAILABLE', 'Weather is temporarily unavailable.') }
}

export const GET = apiHandler(handleGET)
