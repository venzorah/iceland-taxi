import { z } from 'zod'
import { apiHandler, jsonError, jsonOk } from '@/lib/api'
import { geocodeAddress } from '@/lib/maps/google'

const schema = z.object({ address: z.string().min(1) })

async function handlePOST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'VALIDATION_ERROR', 'address is required')
  }
  const result = await geocodeAddress(parsed.data.address)
  if (!result.ok) {
    const status = result.code === 'MISSING_CREDENTIALS' ? 503 : 501
    return jsonError(status, result.code, result.message)
  }
  return jsonOk(result)
}

export const POST = apiHandler(handlePOST)
