import { apiHandler, jsonOk, prisma, ServiceUnavailableError } from '@/lib/api'
import { appearanceFromJson } from '@/lib/admin/content'
async function handleGET() {
  if (!process.env.DATABASE_URL) throw new ServiceUnavailableError()
  const theme = await prisma.themeSettings.findUnique({ where: { id: 'singleton' }, select: { appearance: true, darkModeEnabled: true } })
  const appearance = appearanceFromJson(theme?.appearance)
  return jsonOk({ ok: true, appearance: { defaultLang: appearance.defaultLang }, darkModeEnabled: theme?.darkModeEnabled ?? true })
}

export const GET = apiHandler(handleGET)
