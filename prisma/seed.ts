import { PrismaClient, BookingStatus, CurrencyCode, CustomerCategory, Role, ServiceKind } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.enquiry.deleteMany()
  await prisma.integrationStatus.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.staffNotification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.route.deleteMany()
  await prisma.service.deleteMany()
  await prisma.destination.deleteMany()
  await prisma.faq.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.pricingExtra.deleteMany()
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
      // Other contact/legal fields stay null. WhatsApp is the official company number.
      email: null,
      phone: null,
      whatsappE164: '+3548353111',
      addressLine1: null,
      registrationNumber: null,
      vatNumber: null,
      testimonialsEnabled: false,
    },
    update: {
      testimonialsEnabled: false,
      whatsappE164: '+3548353111',
    },
  })

  await prisma.themeSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', defaultMode: 'LIGHT', darkModeEnabled: true },
    update: { defaultMode: 'LIGHT', darkModeEnabled: true },
  })

  await prisma.exchangeRate.create({
    data: {
      iskPerUsd: 138,
      iskPerEur: 150,
      note: 'Seed demo rates (admin-configurable). iskPerUsd is for historical USD snapshots. iskPerEur prices public euros and new international charges. Not a live FX feed.',
    },
  })

  const img = {
    hero: '/photos/hero.jpg',
    airport: '/photos/airport.jpg',
    goldenCircle: '/photos/golden-circle.jpg',
    northernLights: '/photos/northern-lights.jpg',
    southCoast: '/photos/south-coast.jpg',
    reykjavik: '/photos/reykjavik.jpg',
    glacierLagoon: '/photos/glacier-lagoon.jpg',
    blueLagoon: '/photos/blue-lagoon.jpg',
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
          'International visitors pay in euro (EUR). Icelandic residents can choose ISK or EUR. The currency shown at checkout is the currency you are charged in.',
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

  await prisma.pricingExtra.createMany({
    data: [
      { key: 'meetGreet', labelEn: 'Meet & greet at arrivals', isk: 0, sortOrder: 1 },
      { key: 'childSeat', labelEn: 'Child seat', isk: 2500, sortOrder: 2 },
      { key: 'returnTrip', labelEn: 'Return journey', isk: 0, sortOrder: 3 },
    ],
  })

  const vehicles = await Promise.all(
    [
      { name: 'Standard Sedan', category: 'sedan', pax: 3, bags: 3, useCase: 'Airport & city rides', plate: 'ST-100', upgradeIsk: 0 },
      { name: 'Comfort Sedan', category: 'sedan', pax: 3, bags: 3, useCase: 'Longer transfers', plate: 'RX-482', upgradeIsk: 3000 },
      { name: 'Premium Sedan', category: 'sedan', pax: 3, bags: 2, useCase: 'Business & chauffeur', plate: 'BS-771', upgradeIsk: 6000 },
      { name: 'SUV', category: 'suv', pax: 4, bags: 4, useCase: 'Winter roads & tours', plate: 'KL-115', upgradeIsk: 8000 },
      { name: 'Minivan', category: 'van', pax: 7, bags: 7, useCase: 'Families & small groups', plate: 'MV-220', upgradeIsk: 12000 },
      { name: 'Minibus', category: 'bus', pax: 16, bags: 16, useCase: 'Groups & events', plate: 'MB-016', upgradeIsk: 25000 },
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
      name: 'Juliet',
      role: Role.SUPER_ADMIN,
      staffProfile: { create: { title: 'Super Admin', modules: ['*'] } },
    },
  })

  const bookings = [
    {
      ref: 'ITB-7K4Q2M',
      guestName: 'Emma Larsen',
      guestEmail: 'emma@example.local',
      guestPhone: '+45 20 12 34 56',
      serviceLabel: 'Airport transfer',
      routeLabel: 'KEF → Hotel Borg',
      pickupAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000 + 45 * 60 * 1000),
      durationMinutes: 45,
      passengers: 2,
      luggage: 2,
      vehicleLabel: 'Comfort Sedan',
      vehicleId: comfort.id,
      driverId: ari.id,
      amountSnapshot: 166,
      currency: CurrencyCode.USD,
      status: BookingStatus.DRIVER_ASSIGNED,
      flightNumber: 'FI 615',
      notes: 'Meet & greet with name sign: Larsen. Flight may land early.',
      extras: { meetGreet: true },
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

  const emma = await prisma.booking.findUnique({ where: { ref: 'ITB-7K4Q2M' } })
  if (emma) {
    await prisma.message.createMany({
      data: [
        {
          bookingId: emma.id,
          authorRole: 'customer',
          guestEmail: 'emma@example.local',
          guestName: 'Emma Larsen',
          body: 'Our flight is now landing 20 minutes early, is that okay?',
          unread: true,
        },
        {
          bookingId: emma.id,
          authorId: admin.id,
          authorRole: 'staff',
          body: 'No problem, your driver tracks the flight and will be waiting at arrivals with a name sign.',
          unread: false,
        },
      ],
    })
  }

  // Second job later today for Ari (Hotel → KEF)
  await prisma.booking.create({
    data: {
      ref: 'ITB-ARI-1815',
      guestName: 'Nora Berg',
      guestEmail: 'nora@example.local',
      guestPhone: '+354 555 0100',
      serviceLabel: 'Airport transfer',
      routeLabel: 'Hotel Saga → KEF',
      pickupAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 5 * 60 * 60 * 1000 + 50 * 60 * 1000),
      durationMinutes: 50,
      passengers: 2,
      luggage: 3,
      vehicleLabel: 'SUV',
      vehicleId: suv2.id,
      driverId: ari.id,
      amountSnapshot: 180,
      currency: CurrencyCode.USD,
      status: BookingStatus.DRIVER_ASSIGNED,
      customerCategory: CustomerCategory.INTERNATIONAL,
    },
  })

  await prisma.announcement.createMany({
    data: [
      {
        textEn: 'Book airport transfers with live flight tracking. Add your flight number at checkout.',
        textIs: 'Bókaðu flugvallarakstur með rauntíma flugupplýsingum. Bættu flugnúmerinu við í greiðslu.',
        enabled: true,
        sortOrder: 1,
      },
    ],
  })

  await prisma.seoPage.createMany({
    data: [
      {
        path: '/',
        titleEn: 'Iceland Taxi Booking | Discover Iceland. Travel Comfortably.',
        descriptionEn:
          'Airport transfers, private taxis, tours and vacation drivers across Iceland.',
      },
      { path: '/book', titleEn: 'Book your ride | Iceland Taxi Booking' },
      { path: '/account', titleEn: 'My bookings | Iceland Taxi Booking', noIndex: true },
      { path: '/admin', titleEn: 'Admin | Iceland Taxi Booking', noIndex: true },
      { path: '/driver', titleEn: 'Driver portal | Iceland Taxi Booking', noIndex: true },
      { path: '/about', titleEn: 'About us | Iceland Taxi Booking', descriptionEn: 'Company-owned private transport booked around your Iceland trip.' },
      { path: '/contact', titleEn: 'Contact | Iceland Taxi Booking', descriptionEn: 'Message Iceland Taxi Booking about a booking, quotation or partnership.' },
      { path: '/services', titleEn: 'Services | Iceland Taxi Booking', descriptionEn: 'Airport transfers, private taxis, tours, private drivers and corporate travel.' },
      { path: '/destinations', titleEn: 'Destinations | Iceland Taxi Booking', descriptionEn: 'Popular Iceland destinations for transfers, tours and private-driver days.' },
      { path: '/fleet', titleEn: 'Our fleet | Iceland Taxi Booking', descriptionEn: 'Sedan, SUV, minivan and minibus classes sized for passengers and luggage.' },
      { path: '/how-it-works', titleEn: 'How it works | Iceland Taxi Booking', descriptionEn: 'Choose a trip, confirm details, pay in EUR or ISK, then track and message.' },
      { path: '/faqs', titleEn: 'FAQs | Iceland Taxi Booking', descriptionEn: 'Answers about booking, currency, flight delays, multi-day drivers and cancellations.' },
      { path: '/blog', titleEn: 'Blog | Iceland Taxi Booking', descriptionEn: 'Practical travel notes for airport arrivals, tours and booking in Iceland.' },
      { path: '/travel-guides', titleEn: 'Travel guides | Iceland Taxi Booking', descriptionEn: 'Longer guides for Reykjavík arrivals, Blue Lagoon timing and South Coast days.' },
      { path: '/policies', titleEn: 'Policies | Iceland Taxi Booking', descriptionEn: 'Privacy, terms, cancellation and refund policies.' },
      { path: '/manage-booking', titleEn: 'Manage booking | Iceland Taxi Booking', descriptionEn: 'Look up a trip with your booking reference and checkout email.' },
      { path: '/airport-transfer', titleEn: 'Airport transfers | Iceland Taxi Booking', descriptionEn: 'Private Keflavík Airport transfers with flight tracking and fixed-price routes.' },
      { path: '/private-tours', titleEn: 'Private tours | Iceland Taxi Booking', descriptionEn: 'Private Golden Circle, South Coast and Northern Lights sightseeing tours.' },
      { path: '/private-driver', titleEn: 'Private driver | Iceland Taxi Booking', descriptionEn: 'Hourly to multi-day private chauffeur hire across Iceland.' },
    ],
  })

  const mapsKey = Boolean(process.env.GOOGLE_MAPS_API_KEY)
  const teyaKey = Boolean(
    (process.env.TEYA_CLIENT_ID || process.env.TEYA_MERCHANT_ID) &&
      (process.env.TEYA_CLIENT_SECRET || process.env.TEYA_API_KEY) &&
      process.env.TEYA_STORE_ID &&
      (process.env.TEYA_ENVIRONMENT || 'sandbox') === 'sandbox',
  )

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
        lastError: teyaKey ? null : 'TEYA_CLIENT_ID, TEYA_CLIENT_SECRET, and TEYA_STORE_ID are not set (sandbox only)',
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
  console.log('Company contact fields left null, configure in Admin CMS.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
