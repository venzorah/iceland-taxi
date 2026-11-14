import {z} from 'zod'
export const CONTACT_TOPICS=['Existing booking','New quotation','Corporate travel','Driver enquiry','Website / media','Other'] as const
export const contactSchema=z.object({
 requestKey:z.string().uuid(),name:z.string().trim().min(1).max(100),email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),
 bookingRef:z.string().trim().max(80).optional().default(''),topic:z.enum(CONTACT_TOPICS),body:z.string().trim().min(10).max(4000),website:z.string().max(0).optional()
}).strict()
