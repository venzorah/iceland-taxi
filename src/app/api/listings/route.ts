import { jsonOk } from '@/lib/api'
import { loadPublishedListings } from '@/lib/booking/service'

export async function GET() {
  if (!process.env.DATABASE_URL) return jsonOk({ ok: true, listings: [] })
  try {
    const listings = await loadPublishedListings()
    return jsonOk({ ok: true, listings })
  } catch (error) {
    console.error(error)
    return jsonOk({ ok: true, listings: [] })
  }
}
