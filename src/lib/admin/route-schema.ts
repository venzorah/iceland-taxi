import { z } from 'zod'
const image = z.string().trim().max(2048).refine((value) => {
  if (!value || /^\/(?!\/)/.test(value)) return true
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
}, 'Choose a local image or a secure image URL.').nullable().optional()
const fields = {
  serviceId: z.string().trim().min(1).max(128).nullable().optional(),
  fromLabel: z.string().trim().min(1, 'Enter a pickup location.').max(200),
  toLabel: z.string().trim().min(1, 'Enter a destination.').max(200),
  minutes: z.number().int().positive().max(10080).nullable().optional(),
  km: z.number().positive().max(100000).nullable().optional(),
  fromIsk: z.number().int().positive('Enter a price greater than zero.').max(2147483647),
  returnTrip: z.boolean().optional(), active: z.boolean().optional(), override: z.boolean().optional(),
  imageUrl: image,
}
export const createRouteSchema = z.object(fields).strict()
export const updateRouteSchema = createRouteSchema.partial().refine(value => Object.keys(value).length > 0, 'Choose a field to update.')
