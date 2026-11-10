import { jsonOk, prisma, withDb } from '@/lib/api'

/**
 * Company profile is CMS/admin-owned. Never invent contact, registration,
 * testimonials, or fleet ownership claims when fields are unset.
 */
export async function GET() {
  const data = await withDb(
    async () => {
      const settings = await prisma.companySettings.findUnique({ where: { id: 'singleton' } })
      return {
        source: 'database' as const,
        company: settings ?? {
          displayName: 'Iceland Taxi Booking',
          email: null,
          phone: null,
          whatsappE164: null,
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
        whatsappE164: null,
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
