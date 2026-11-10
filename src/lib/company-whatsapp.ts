import { prisma } from '@/lib/prisma'
import { companyWhatsAppNumber, normalizeStoredE164, OFFICIAL_WHATSAPP_E164 } from '@/lib/whatsapp'

/**
 * Use the official WhatsApp number when CompanySettings has none, and store it
 * on the singleton row. Does not change email, phone, address, or other fields.
 * A different number already saved in admin is left as-is.
 */
export async function ensureOfficialWhatsApp() {
  const fallback = OFFICIAL_WHATSAPP_E164
  try {
    const row = await prisma.companySettings.findUnique({
      where: { id: 'singleton' },
      select: { whatsappE164: true },
    })
    const stored = normalizeStoredE164(row?.whatsappE164)
    if (stored) return stored
    if (!row) {
      await prisma.companySettings.create({
        data: {
          id: 'singleton',
          displayName: 'Iceland Taxi Booking',
          whatsappE164: fallback,
        },
      })
    } else {
      await prisma.companySettings.update({
        where: { id: 'singleton' },
        data: { whatsappE164: fallback },
      })
    }
    return fallback
  } catch (error) {
    console.error('official whatsapp', error instanceof Error ? error.name : 'error')
    return companyWhatsAppNumber(null)
  }
}
