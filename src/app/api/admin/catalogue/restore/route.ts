import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { applyCatalogueRestore, previewCatalogueRestore } from '@/lib/catalogue/restore'

// Only Super Admin can restore across catalogue, website content and currency settings.
export const GET = apiHandler(async () => {
  const blocked = await rejectDriverOnly('staff')
  if (blocked) return blocked
  return jsonOk({ ok: true, plan: await previewCatalogueRestore(prisma) })
})
const schema = z.object({ fingerprint: z.string().regex(/^[a-f0-9]{64}$/), restoreExchangeRate: z.boolean() }).strict()
export const POST = apiHandler(async (req: Request) => {
  const blocked = await rejectDriverOnly('staff')
  if (blocked) return blocked
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Review the restore preview before continuing.')
  try { return jsonOk({ ok: true, ...await applyCatalogueRestore(prisma, parsed.data.fingerprint, parsed.data.restoreExchangeRate) }) }
  catch (error) {
    if (['P2002', 'P2034'].includes((error as { code?: string }).code || '')) return jsonError(409, 'CATALOGUE_CHANGED', 'The catalogue changed. Review a fresh preview before restoring.')
    throw error
  }
})
