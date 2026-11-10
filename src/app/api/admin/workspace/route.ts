import { jsonOk, prisma, withDb } from '@/lib/api'
import { BLOG_POSTS, SEO_SLUG_PAGES, TRAVEL_GUIDES } from '@/lib/content/editorial'
import { DESTINATIONS } from '@/lib/design/data'
import { SEO_PUBLIC_PAGES } from '@/lib/design/routes'
import { integrationConfigured, teyaCredentials, whatsappCloudCredentials } from '@/lib/env'
import { describeWhatsAppFeature } from '@/lib/whatsapp'

function moneyLabel(currency: string, amount: number) {
  if (currency === 'EUR') return `€${amount.toLocaleString('en-US').replace(/,/g, '.')}`
  if (currency === 'ISK') return `ISK ${amount.toLocaleString('en-US')}`
  return `$${amount.toLocaleString('en-US')}`
}

function pages() {
  return [
    ...SEO_PUBLIC_PAGES.map((page) => ({ title: page.titleEn, href: page.path, kind: 'Public page', published: true })),
    ...BLOG_POSTS.map((post) => ({ title: post.title, href: `/blog/${post.slug}`, kind: 'Blog', published: true })),
    ...TRAVEL_GUIDES.map((guide) => ({ title: guide.title, href: `/travel-guides/${guide.slug}`, kind: 'Travel guide', published: true })),
    ...SEO_SLUG_PAGES.map((page) => ({ title: page.title, href: page.published ? `/en/${page.slug}` : page.href, kind: 'SEO landing', published: page.published })),
  ]
}

function integrations() {
  const teya = teyaCredentials()
  return [
    {
      key: 'teya',
      label: 'Teya payments',
      configured: integrationConfigured('teya'),
      message: teya.configured && teya.sandboxOnly ? 'Sandbox credentials present' : 'Sandbox keys are not set',
    },
    {
      key: 'google_maps',
      label: 'Google Maps',
      configured: integrationConfigured('google_maps'),
      message: integrationConfigured('google_maps') ? 'API key present' : 'GOOGLE_MAPS_API_KEY is not set',
    },
    {
      key: 'smtp',
      label: 'Email',
      configured: integrationConfigured('smtp'),
      message: integrationConfigured('smtp') ? 'SMTP_URL present' : 'SMTP_URL is not set',
    },
    {
      key: 'sms',
      label: 'SMS',
      configured: integrationConfigured('sms'),
      message: integrationConfigured('sms') ? 'SMS_API_KEY present' : 'SMS_API_KEY is not set',
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp notices',
      configured: integrationConfigured('whatsapp'),
      message: integrationConfigured('whatsapp')
        ? 'Cloud API credentials present. Outbound notices only. Inbound chats are not synced.'
        : 'WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID are not set. Staff open a WhatsApp link.',
    },
  ]
}

function emptyCompany() {
  return {
    displayName: 'Iceland Taxi Booking',
    email: null as string | null,
    phone: null as string | null,
    whatsappE164: null as string | null,
    addressLine1: null as string | null,
    city: null as string | null,
    registrationNumber: null as string | null,
    vatNumber: null as string | null,
    aboutEn: null as string | null,
  }
}

export async function GET() {
  const data = await withDb(
    async () => {
      const [destinations, users, bookings, bookingCount, grouped, company] = await Promise.all([
        prisma.destination.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.user.findMany({
          where: { role: 'CUSTOMER' },
          select: { name: true, email: true, phone: true, category: true, preferredCurrency: true, _count: { select: { bookings: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
        prisma.booking.findMany({
          orderBy: { createdAt: 'desc' },
          take: 200,
          select: { guestName: true, guestEmail: true, guestPhone: true, currency: true, customerCategory: true, customerId: true },
        }),
        prisma.booking.count(),
        prisma.booking.groupBy({
          by: ['status', 'currency'],
          _count: { _all: true },
          _sum: { amountSnapshot: true },
        }),
        prisma.companySettings.findUnique({ where: { id: 'singleton' } }),
      ])

      const guestSeen = new Set<string>()
      const guests = bookings.flatMap((booking) => {
        const email = booking.guestEmail?.trim()
        if (!email || guestSeen.has(email.toLowerCase())) return []
        guestSeen.add(email.toLowerCase())
        return [{
          name: booking.guestName || 'Guest',
          email,
          phone: booking.guestPhone,
          category: booking.customerCategory,
          bookings: bookings.filter((row) => row.guestEmail?.toLowerCase() === email.toLowerCase()).length,
          currency: booking.currency,
        }]
      })

      const byStatus = new Map<string, number>()
      const byCurrency = new Map<string, { count: number; amount: number }>()
      for (const row of grouped) {
        byStatus.set(row.status, (byStatus.get(row.status) || 0) + row._count._all)
        const current = byCurrency.get(row.currency) || { count: 0, amount: 0 }
        current.count += row._count._all
        current.amount += row._sum.amountSnapshot || 0
        byCurrency.set(row.currency, current)
      }

      return {
        source: 'database' as const,
        destinations: destinations.map((item) => ({
          name: item.name,
          note: item.note,
          imageUrl: item.imageUrl,
          active: item.active,
        })),
        customers: [
          ...users.map((user) => ({
            name: user.name || 'Customer',
            email: user.email,
            phone: user.phone,
            category: user.category,
            bookings: user._count.bookings,
            currency: user.preferredCurrency,
          })),
          ...guests.filter((guest) => !users.some((user) => user.email.toLowerCase() === guest.email.toLowerCase())),
        ],
        reports: {
          bookings: bookingCount,
          byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
          byCurrency: [...byCurrency.entries()].map(([currency, row]) => ({
            currency,
            count: row.count,
            amount: row.amount,
            label: moneyLabel(currency, row.amount),
          })),
        },
        reviews: { testimonialsEnabled: company?.testimonialsEnabled ?? false, items: [] as [] },
        settings: {
          company: {
            displayName: company?.displayName || 'Iceland Taxi Booking',
            email: company?.email ?? null,
            phone: company?.phone ?? null,
            whatsappE164: company?.whatsappE164 ?? null,
            addressLine1: company?.addressLine1 ?? null,
            city: company?.city ?? null,
            registrationNumber: company?.registrationNumber ?? null,
            vatNumber: company?.vatNumber ?? null,
            aboutEn: company?.aboutEn ?? null,
          },
        },
      }
    },
    () => ({
      source: 'seed' as const,
      destinations: DESTINATIONS.map((item) => ({ name: item.name, note: item.note, imageUrl: item.img, active: true })),
      customers: [{ name: 'Emma Larsen', email: 'emma@example.local', phone: null, category: 'INTERNATIONAL', bookings: 1, currency: 'EUR' }],
      reports: {
        bookings: 0,
        byStatus: [],
        byCurrency: [],
      },
      reviews: { testimonialsEnabled: false, items: [] as [] },
      settings: { company: emptyCompany() },
    }),
  )

  const whatsapp = describeWhatsAppFeature({
    companyE164: data.settings.company.whatsappE164,
    cloudConfigured: whatsappCloudCredentials().configured,
  })

  return jsonOk({
    ok: true,
    ...data,
    whatsapp,
    pages: pages(),
    languages: [
      { code: 'en', name: 'English', default: true },
      { code: 'is', name: 'Íslenska', default: false },
    ],
    integrations: integrations(),
  })
}
