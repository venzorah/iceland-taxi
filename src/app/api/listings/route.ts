import { apiHandler, jsonOk, ServiceUnavailableError } from '@/lib/api'
import { loadPublishedListings, getExchangeRates } from '@/lib/booking/service'
async function handleGET() {
  if (!process.env.DATABASE_URL) throw new ServiceUnavailableError()
  const [listings, rates] = await Promise.all([loadPublishedListings(), getExchangeRates()])
  return jsonOk({ ok: true, listings: listings.map(listing => ({ ...listing, iskPerEur: rates.iskPerEur })) })
}

export const GET = apiHandler(handleGET)
