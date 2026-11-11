import { EnquiryChannel } from '@prisma/client'
import { z } from 'zod'
import { jsonError, jsonOk, prisma } from '@/lib/api'

const schema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6),
  channel: z.enum(['EMAIL', 'WHATSAPP']),
  fromLabel: z.string().trim().min(1),
  toLabel: z.string().trim().min(1),
  tripDate: z.string().trim().min(1),
  tripTime: z.string().trim().min(1),
  passengers: z.number().int().positive().max(30),
  notes: z.string().trim().max(2000).optional(),
})

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return jsonError(503, 'DATABASE_REQUIRED', 'DATABASE_URL is required to save an enquiry')
  }
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'VALIDATION_ERROR', 'Check the enquiry fields. Email or WhatsApp is required.', {
      issues: parsed.error.flatten(),
    })
  }
  const digits = parsed.data.phone.replace(/\D/g, '')
  if (parsed.data.channel === 'WHATSAPP' && (digits.length < 8 || digits.length > 15)) {
    return jsonError(400, 'VALIDATION_ERROR', 'Enter a WhatsApp number with the country code.')
  }
  try {
    const enquiry = await prisma.enquiry.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone.trim(),
        channel: parsed.data.channel === 'WHATSAPP' ? EnquiryChannel.WHATSAPP : EnquiryChannel.EMAIL,
        fromLabel: parsed.data.fromLabel,
        toLabel: parsed.data.toLabel,
        tripDate: parsed.data.tripDate,
        tripTime: parsed.data.tripTime,
        passengers: parsed.data.passengers,
        notes: parsed.data.notes || null,
      },
    })
    try {
      const { notifyEnquiryReceived } = await import('@/lib/email/notices')
      await notifyEnquiryReceived(enquiry)
    } catch (error) {
      console.error(error)
    }
    return jsonOk({ ok: true, enquiry }, { status: 201 })
  } catch (error) {
    console.error(error)
    return jsonError(503, 'DATABASE_ERROR', 'Could not save the enquiry')
  }
}
