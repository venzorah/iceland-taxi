import { z } from 'zod'
import { apiHandler, jsonError, jsonOk, prisma } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth/session'
const schema = z.object({ name: z.string().trim().min(1).max(100), phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/), category: z.enum(['INTERNATIONAL', 'RESIDENT']), preferredCurrency: z.enum(['EUR', 'ISK']), preferredLang: z.enum(['en', 'is']) }).strict()
const select = { name: true, email: true, phone: true, category: true, preferredCurrency: true, preferredLang: true } as const
export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (user?.role !== 'CUSTOMER') return jsonError(401, 'UNAUTHORIZED', 'Sign in with a customer account.')
  const profile = { name: user.name, email: user.email, phone: user.phone, category: user.category, preferredCurrency: user.preferredCurrency, preferredLang: user.preferredLang }
  return jsonOk({ ok: true, profile: profile ? { ...profile, phone: profile.phone || '', preferredCurrency: profile.preferredCurrency === 'ISK' ? 'ISK' : 'EUR' } : null }, { headers: { 'Cache-Control': 'private, no-store' } })
})
export const PATCH = apiHandler(async (req: Request) => {
  const user = await getCurrentUser()
  if (user?.role !== 'CUSTOMER') return jsonError(401, 'UNAUTHORIZED', 'Sign in with a customer account.')
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Enter a valid name, phone and preferences.')
  const profile = await prisma.user.update({ where: { id: user.id }, data: parsed.data, select })
  return jsonOk({ ok: true, profile })
})
