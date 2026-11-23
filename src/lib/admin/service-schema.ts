import { z } from 'zod'
import { ServiceKind } from '@prisma/client'
const image = z.string().trim().max(2048).refine(value => {
  if (!value || /^\/(?!\/)/.test(value)) return true
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
}, 'Choose a local image or a secure image URL.').nullable().optional()
export const createServiceSchema = z.object({
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  kind: z.nativeEnum(ServiceKind), titleEn: z.string().trim().min(1).max(150),
  titleIs: z.string().trim().max(150).nullable().optional(),
  blurbEn: z.string().trim().max(4000).nullable().optional(), blurbIs: z.string().trim().max(4000).nullable().optional(),
  imageUrl: image, fromIsk: z.number().int().nonnegative().max(2147483647).nullable().optional(),
  hoursLabel: z.string().trim().max(100).nullable().optional(), paxLabel: z.string().trim().max(100).nullable().optional(),
  active: z.boolean().optional(), sortOrder: z.number().int().min(0).max(100000).optional(),
}).strict()
export const updateServiceSchema = createServiceSchema.partial().refine(value => Object.keys(value).length > 0, 'Choose a field to update.')
