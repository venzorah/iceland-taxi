import { z } from 'zod'

import { appearanceFromJson, barFromJson, DEFAULT_APPEARANCE, type AppearanceConfig } from '@/lib/admin/content'
import { jsonError, jsonOk, prisma } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return jsonOk({ ok: true, source: 'default', appearance: DEFAULT_APPEARANCE, announcementBar: null })
  }
  const theme = await prisma.themeSettings.findUnique({ where: { id: 'singleton' } }).catch(() => null)
  return jsonOk({
    ok: true,
    source: theme ? 'database' : 'default',
    appearance: appearanceFromJson(theme?.appearance),
    announcementBar: barFromJson(theme?.announcementBar),
    darkModeEnabled: theme?.darkModeEnabled ?? true,
  })
}

const patchSchema = z.object({
  appearance: z
    .object({
      navy: z.string(),
      yellow: z.string(),
      mint: z.string(),
      cyan: z.string(),
      light: z.boolean(),
      dark: z.boolean(),
      surfaces: z.record(z.string(), z.enum(['light', 'dark'])),
      defaultLang: z.enum(['en', 'is']),
    })
    .partial()
    .optional(),
  announcementBar: z
    .object({
      managed: z.boolean(),
      enabled: z.boolean(),
      speed: z.enum(['slow', 'normal', 'fast']),
      style: z.enum(['navy', 'yellow', 'mint']),
      pauseOnHover: z.boolean(),
    })
    .optional(),
})

export async function PATCH(req: Request) {
  const blocked = await rejectDriverOnly()
  if (blocked) return blocked
  if (!process.env.DATABASE_URL) return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL required')
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonError(400, 'VALIDATION_ERROR', 'Invalid theme.')
  const current = await prisma.themeSettings.findUnique({ where: { id: 'singleton' } }).catch(() => null)
  const appearance: AppearanceConfig = {
    ...appearanceFromJson(current?.appearance),
    ...parsed.data.appearance,
    surfaces: {
      ...appearanceFromJson(current?.appearance).surfaces,
      ...(parsed.data.appearance?.surfaces || {}),
    },
  }
  if (!appearance.light && !appearance.dark) return jsonError(400, 'VALIDATION_ERROR', 'At least one theme must stay on.')
  const theme = await prisma.themeSettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      appearance,
      announcementBar: parsed.data.announcementBar,
      darkModeEnabled: appearance.dark,
      defaultMode: appearance.surfaces['Public website'] === 'dark' ? 'DARK' : 'LIGHT',
    },
    update: {
      appearance,
      ...(parsed.data.announcementBar ? { announcementBar: parsed.data.announcementBar } : {}),
      darkModeEnabled: appearance.dark,
      defaultMode: appearance.surfaces['Public website'] === 'dark' ? 'DARK' : 'LIGHT',
    },
  })
  return jsonOk({ ok: true, appearance: appearanceFromJson(theme.appearance), announcementBar: barFromJson(theme.announcementBar) })
}
