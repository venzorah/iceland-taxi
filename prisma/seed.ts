import { PrismaClient, BookingStatus, CurrencyCode, CustomerCategory, Role, ServiceKind } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.integrationStatus.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.message.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.route.deleteMany()
  await prisma.service.deleteMany()
  await prisma.destination.deleteMany()
  await prisma.faq.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.driver.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.staffProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.exchangeRate.deleteMany()
  await prisma.seoPage.deleteMany()

  await prisma.companySettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      displayName: 'Iceland Taxi Booking',
      // Contact/legal fields intentionally null — set via Admin CMS only.
      email: null,
      phone: null,
      whatsappE164: null,
      addressLine1: null,
      registrationNumber: null,
      vatNumber: null,
      testimonialsEnabled: false,
    },
    update: {
      testimonialsEnabled: false,
    },
  })

  await prisma.themeSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', defaultMode: 'LIGHT', darkModeEnabled: true },
    update: { defaultMode: 'LIGHT', darkModeEnabled: true },
  })

  await prisma.exchangeRate.create({
    data: { iskPerUsd: 138, note: 'Seed demo rate (admin-configurable)' },
  })

  const img = {
    hero: 'https://cdn.magicpatterns.com/patterns/generated-images/7db922cc-9fca-421a-b5d1-a03e222e9570.jpg',
    airport: 'https://cdn.magicpatterns.com/patterns/generated-images/eaad9406-8077-461d-b065-8f05c7371f6b.jpg',
    goldenCircle: 'https://cdn.magicpatterns.com/patterns/generated-images/e3147a54-6262-4018-8ef0-4aa996090a25.jpg',
    northernLights: 'https://cdn.magicpatterns.com/patterns/generated-images/393a50f2-7ddb-4702-97b9-db093684d1a3.jpg',
    southCoast: 'https://cdn.magicpatterns.com/patterns/generated-images/b8399b1f-8dbe-43f9-b02a-7b7cc03acb28.jpg',
    reykjavik: 'https://cdn.magicpatterns.com/patterns/generated-images/6c762c8f-4671-4ed3-896e-4f1c0f17f247.jpg',
    glacierLagoon: 'https://cdn.magicpatterns.com/patterns/generated-images/1d4a0a8f-4487-4611-91fc-fa86a995378e.jpg',
    blueLagoon: 'https://cdn.magicpatterns.com/patterns/generated-images/7d74ce25-2bd0-4460-a6ce-62e8ff747133.jpg',
  }

  const airport = await prisma.service.create({
    data: {
      slug: 'airport-transfer',
      kind: ServiceKind.AIRPORT,
      titleEn: 'Airport transfer',
      titleIs: 'Flugvallarakstur',
      fromIsk: 14900,
      active: true,
      sortOrder: 1,
    },
  })

  await prisma.service.createMany({
    data: [
      {
        slug: 'private-taxi',
        kind: ServiceKind.TAXI,
        titleEn: 'Private taxi',
        titleIs: 'Einkabíll',
        fromIsk: 8900,
        sortOrder: 2,
      },
      {
        slug: 'golden-circle',
        kind: ServiceKind.TOUR,
        titleEn: 'Golden Circle Private Tour',
        titleIs: 'Gullni hringurinn',
        blurbEn: 'Þingvellir, Geysir and Gullfoss at your own pace.',
        imageUrl: img.goldenCircle,
        hoursLabel: '7–8 h',
        paxLabel: 'Up to 8',
        fromIsk: 89900,
        sortOrder: 3,
      },
      {
        slug: 'south-coast',
        kind: ServiceKind.TOUR,
        titleEn: 'South Coast Private Tour',
        blurbEn: 'Seljalandsfoss, Skógafoss and the black sands of Reynisfjara.',
        imageUrl: img.southCoast,
        hoursLabel: '10–11 h',
        paxLabel: 'Up to 8',
        fromIsk: 119900,
        sortOrder: 4,
      },
      {
        slug: 'northern-lights',
        kind: ServiceKind.TOUR,
        titleEn: 'Northern Lights Experience',
        blurbEn: 'Your driver follows the forecast away from city light.',
        imageUrl: img.northernLights,
        hoursLabel: '3–4 h',
        paxLabel: 'Up to 8',
        fromIsk: 59900,
        sortOrder: 5,
      },
      {
        slug: 'private-driver',
        kind: ServiceKind.DRIVER,
        titleEn: 'Private driver',
        titleIs: 'Einkabílstjóri',
        fromIsk: 24900,
        sortOrder: 6,
      },
    ],
  })

  await prisma.route.createMany({
    data: [
      { serviceId: airport.id, fromLabel: 'Keflavík Airport (KEF)', toLabel: 'Reykjavík city centre', minutes: 45, km: 49, fromIsk: 22900 },
      { serviceId: airport.id, fromLabel: 'Keflavík Airport (KEF)', toLabel: 'Blue Lagoon', minutes: 20, km: 23, fromIsk: 14900 },
      { serviceId: airport.id, fromLabel: 'Reykjavík hotel', toLabel: 'Keflavík Airport (KEF)', minutes: 45, km: 49, fromIsk: 22900 },
      { serviceId: airport.id, fromLabel: 'Keflavík Airport (KEF)', toLabel: 'Selfoss', minutes: 75, km: 100, fromIsk: 39900 },
    ],
  })

  await prisma.destination.createMany({
    data: [
      { name: 'Golden Circle', note: '1 h from Reykjavík', imageUrl: img.goldenCircle, sortOrder: 1 },
      { name: 'Glacier Lagoon', note: '5 h from Reykjavík', imageUrl: img.glacierLagoon, sortOrder: 2 },
      { name: 'Blue Lagoon', note: '20 min from KEF', imageUrl: img.blueLagoon, sortOrder: 3 },
      { name: 'Reykjavík', note: 'City tours & hotel transfers', imageUrl: img.reykjavik, sortOrder: 4 },
      { name: 'South Coast', note: '2 h from Reykjavík', imageUrl: img.southCoast, sortOrder: 5 },
    ],
  })

  await prisma.faq.createMany({
    data: [
      {
        questionEn: 'Do I need an account to book?',
        answerEn:
          'No. You can book as a guest with your name, email and phone number. You will receive a booking reference that lets you look up and manage your booking later.',
        sortOrder: 1,
      },
      {
        questionEn: 'Which currency will I pay in?',
        answerEn:
          'International visitors pay in USD. Icelandic residents can choose ISK or USD. The currency shown at checkout is the currency you are charged in.',
        sortOrder: 2,
      },
      {
        questionEn: 'What happens if my flight is delayed?',
        answerEn:
          'Add your flight number when booking. Your driver tracks the arrival time, and waiting-time rules for your booking are shown before you pay.',
        sortOrder: 3,
      },
      {
        questionEn: 'Can I hire a driver for several days?',
        answerEn:
          'Yes. Choose Private driver and select hourly, half-day, full-day or multi-day. For a custom itinerary, send a quotation request and we will reply with a price.',
        sortOrder: 4,
      },
      {
        questionEn: 'Can I cancel or change my booking?',
        answerEn:
          'You can request changes or a cancellation from your booking page or by message. Cancellation terms for each service are shown before you pay.',
        sortOrder: 5,
      },
    ],
  })

  const vehicles = await Promise.all(
    [
      { name: 'Standard Sedan', category: 'sedan', pax: 3, bags: 3, useCase: 'Airport & city rides', plate: 'ST-100' },
      { name: 'Comfort Sedan', category: 'sedan', pax: 3, bags: 3, useCase: 'Longer transfers', plate: 'RX-482' },
      { name: 'Premium Sedan', category: 'sedan', pax: 3, bags: 2, useCase: 'Business & chauffeur', plate: 'BS-771' },
      { name: 'SUV', category: 'suv', pax: 4, bags: 4, useCase: 'Winter roads & tours', plate: 'KL-115' },
      { name: 'Minivan', category: 'van', pax: 7, bags: 7, useCase: 'Families & small groups', plate: 'MV-220' },
      { name: 'Minibus', category: 'bus', pax: 16, bags: 16, useCase: 'Groups & events', plate: 'MB-016' },
    ].map((v) => prisma.vehicle.create({ data: v })),
  )

  const comfort = vehicles.find((v) => v.plate === 'RX-482')!
  const suv = vehicles.find((v) => v.plate === 'KL-115')!
  const suv2 = await prisma.vehicle.create({
    data: { name: 'SUV', category: 'suv', pax: 4, bags: 4, useCase: 'Tours', plate: 'PT-903' },
  })
  const premium = vehicles.find((v) => v.plate === 'BS-771')!
  const minivan = vehicles.find((v) => v.plate === 'MV-220')!

  const gunnarUser = await prisma.user.create({
    data: { email: 'gunnar.driver@example.local', name: 'Gunnar H.', role: Role.DRIVER },
  })
  const sigrunUser = await prisma.user.create({
    data: { email: 'sigrun.driver@example.local', name: 'Sigrún B.', role: Role.DRIVER },
  })
  const ariUser = await prisma.user.create({
    data: { email: 'ari.driver@example.local', name: 'Ari Þ.', role: Role.DRIVER },
  })
  const katrinUser = await prisma.user.create({
    data: { email: 'katrin.driver@example.local', name: 'Katrín E.', role: Role.DRIVER },
  })
  const olafurUser = await prisma.user.create({
    data: { email: 'olafur.driver@example.local', name: 'Ólafur S.', role: Role.DRIVER },
  })

  const gunnar = await prisma.driver.create({
    data: { userId: gunnarUser.id, displayName: 'Gunnar H.', status: 'On trip', vehicleId: comfort.id },
  })
  const sigrun = await prisma.driver.create({
    data: { userId: sigrunUser.id, displayName: 'Sigrún B.', status: 'On trip', vehicleId: suv.id },
  })
  const ari = await prisma.driver.create({
    data: { userId: ariUser.id, displayName: 'Ari Þ.', status: 'Available', vehicleId: suv2.id },
  })
  await prisma.driver.create({
    data: { userId: katrinUser.id, displayName: 'Katrín E.', status: 'Available', vehicleId: minivan.id },
  })
  await prisma.driver.create({
    data: { userId: olafurUser.id, displayName: 'Ólafur S.', status: 'Off duty', vehicleId: premium.id },
  })

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.local',
      name: 'Platform Admin',
      role: Role.SUPER_ADMIN,
      staffProfile: { create: { title: 'Super Admin', modules: ['*'] } },
    },
  })

  const bookings = [
    {
      ref: 'ITB-7K4Q2M',
      guestName: 'Emma Larsen',
      guestEmail: 'emma@example.local',
      serviceLabel: 'Airport transfer',
      routeLabel: 'KEF → Hotel Borg',
      pickupAt: new Date(),
      passengers: 2,
      vehicleLabel: 'Standard Sedan',
      driverId: null as string | null,
      amountSnapshot: 166,
      currency: CurrencyCode.USD,
      status: BookingStatus.CONFIRMED,
      flightNumber: 'FI 615',
      customerCategory: CustomerCategory.INTERNATIONAL,
    },
    {
      ref: 'ITB-3HD8WN',
      guestName: 'Jón Sigurðsson',
      guestEmail: 'jon@example.local',
      serviceLabel: 'Airport transfer',
      routeLabel: 'Garðabær → KEF',
      pickupAt: new Date(),
      passengers: 1,
      vehicleLabel: 'Comfort Sedan',
      driverId: gunnar.id,
      amountSnapshot: 24900,
      currency: CurrencyCode.ISK,
      status: BookingStatus.COMPLETED,
      customerCategory: CustomerCategory.RESIDENT,
    },
    {
      ref: 'ITB-9PL2XA',
      guestName: 'Kenji Watanabe',
      guestEmail: 'kenji@example.local',
      serviceLabel: 'Golden Circle Private Tour',
      routeLabel: 'Reykjavík → Golden Circle',
      pickupAt: new Date(),
      passengers: 4,
      vehicleLabel: 'SUV',
      driverId: sigrun.id,
      amountSnapshot: 710,
      currency: CurrencyCode.USD,
      status: BookingStatus.IN_PROGRESS,
      customerCategory: CustomerCategory.INTERNATIONAL,
    },
    {
      ref: 'ITB-5RT7CV',
      guestName: 'Sarah Mitchell',
      guestEmail: 'sarah@example.local',
      serviceLabel: 'Northern Lights Experience',
      routeLabel: 'Reykjavík → Þingvellir',
      pickupAt: new Date(),
      passengers: 3,
      vehicleLabel: 'SUV',
      driverId: ari.id,
      amountSnapshot: 434,
      currency: CurrencyCode.USD,
      status: BookingStatus.DRIVER_ASSIGNED,
      customerCategory: CustomerCategory.INTERNATIONAL,
    },
    {
      ref: 'ITB-2MW6QE',
      guestName: 'Anna Kowalska',
      guestEmail: 'anna@example.local',
      serviceLabel: 'Airport transfer',
      routeLabel: 'KEF → Blue Lagoon',
      pickupAt: new Date(),
      passengers: 5,
      vehicleLabel: 'Minivan',
      driverId: gunnar.id,
      amountSnapshot: 195,
      currency: CurrencyCode.USD,
      status: BookingStatus.DRIVER_EN_ROUTE,
      flightNumber: 'W6 1471',
      customerCategory: CustomerCategory.INTERNATIONAL,
    },
    {
      ref: 'ITB-8NB4KS',
      guestName: 'Helga Jónsdóttir',
      guestEmail: 'helga@example.local',
      serviceLabel: 'Private driver · 8 h',
      routeLabel: 'Akureyri pickup',
      pickupAt: new Date(),
      passengers: 2,
      vehicleLabel: 'Premium Sedan',
      driverId: null,
      amountSnapshot: 129900,
      currency: CurrencyCode.ISK,
      status: BookingStatus.AWAITING_PAYMENT,
      customerCategory: CustomerCategory.RESIDENT,
    },
    {
      ref: 'ITB-4QX1ZP',
      guestName: 'Lucas Martin',
      guestEmail: 'lucas@example.local',
      serviceLabel: 'Custom quotation',
      routeLabel: 'Ring Road · 5 days',
      pickupAt: null,
      passengers: 6,
      vehicleLabel: 'Minibus',
      driverId: null,
      amountSnapshot: 0,
      currency: CurrencyCode.USD,
      status: BookingStatus.PENDING,
      customerCategory: CustomerCategory.INTERNATIONAL,
    },
  ]

  for (const b of bookings) {
    await prisma.booking.create({ data: b })
  }

  await prisma.announcement.createMany({
    data: [
      {
        textEn: 'Book airport transfers with live flight tracking — add your flight number at checkout.',
        textIs: 'Bókaðu flugvallarakstur með rauntíma flugupplýsingum — bættu flugnúmerinu við í greiðslu.',
        enabled: true,
        sortOrder: 1,
      },
    ],
  })

  await prisma.seoPage.createMany({
    data: [
      {
        path: '/',
        titleEn: 'Iceland Taxi Booking — Discover Iceland. Travel Comfortably.',
        descriptionEn:
          'Airport transfers, private taxis, tours and vacation drivers across Iceland.',
      },
      { path: '/book', titleEn: 'Book your ride — Iceland Taxi Booking' },
      { path: '/account', titleEn: 'My bookings — Iceland Taxi Booking', noIndex: true },
      { path: '/admin', titleEn: 'Admin — Iceland Taxi Booking', noIndex: true },
      { path: '/driver', titleEn: 'Driver portal — Iceland Taxi Booking', noIndex: true },
    ],
  })

  const mapsKey = Boolean(process.env.GOOGLE_MAPS_API_KEY)
  const teyaKey = Boolean(process.env.TEYA_MERCHANT_ID && process.env.TEYA_API_KEY)

  await prisma.integrationStatus.createMany({
    data: [
      {
        key: 'google_maps',
        label: 'Google Maps',
        configured: mapsKey,
        lastError: mapsKey ? null : 'GOOGLE_MAPS_API_KEY is not set',
      },
      {
        key: 'teya',
        label: 'Teya payments',
        configured: teyaKey,
        lastError: teyaKey ? null : 'TEYA_MERCHANT_ID / TEYA_API_KEY are not set',
      },
      {
        key: 'smtp',
        label: 'Transactional email',
        configured: Boolean(process.env.SMTP_URL),
        lastError: process.env.SMTP_URL ? null : 'SMTP_URL is not set',
      },
      {
        key: 'sms',
        label: 'SMS',
        configured: Boolean(process.env.SMS_API_KEY),
        lastError: process.env.SMS_API_KEY ? null : 'SMS_API_KEY is not set',
      },
    ],
  })

  console.log(`Seed complete. Admin user: ${admin.email}`)
  console.log('Company contact fields left null — configure in Admin CMS.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
