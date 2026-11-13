import { jsonOk, prisma } from '@/lib/api'

export async function GET() {
  if (!process.env.DATABASE_URL) return jsonOk({ ok: true, blocks: {} })
  const rows = await prisma.siteBlock.findMany().catch(() => [])
  const blocks: Record<string, string> = {}
  for (const row of rows) {
    if (row.value.trim()) blocks[row.key] = row.value
  }
  return jsonOk({ ok: true, blocks })
}
