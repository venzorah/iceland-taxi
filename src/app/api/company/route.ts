import { apiHandler, jsonOk, prisma, withDb } from '@/lib/api'
import { OFFICIAL_WHATSAPP_E164 } from '@/lib/whatsapp'

/**
 * Company profile is CMS/admin-owned. Never invent contact, registration,
 * testimonials, or fleet ownership claims when fields are unset.
 */
async function handleGET() {
  const data = await withDb(
    async () => {
      const settings = await prisma.companySettings.findUnique({ where: { id: 'singleton' } })
      const whatsappE164 = settings?.whatsappE164 || OFFICIAL_WHATSAPP_E164
      return {
        source: 'database' as const,
        company: settings
          ? { ...settings, whatsappE164 }
          : {
              displayName: 'Iceland Taxi Booking',
              email: null,
              phone: null,
              whatsappE164,
              addressLine1: null,
              registrationNumber: null,
              vatNumber: null,
              testimonialsEnabled: false,
            },
      }
    },
    () => ({
      source: 'defaults' as const,
      company: {
        displayName: 'Iceland Taxi Booking',
        email: null,
        phone: null,
        whatsappE164: OFFICIAL_WHATSAPP_E164,
        addressLine1: null,
        registrationNumber: null,
        vatNumber: null,
        aboutEn: null,
        testimonialsEnabled: false,
      },
      note: 'Contact and legal fields are unset until configured in Admin CMS.',
    }),
  )

  return jsonOk({ ok: true, ...data })
}

export const GET = apiHandler(handleGET)
