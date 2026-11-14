import { AIRPORT_ROUTES, FLEET, TOURS, DESTINATIONS, FAQS, SERVICE_CATEGORIES } from '@/lib/design/data'
import { apiHandler, jsonOk, withDb, prisma } from '@/lib/api'

async function handleGET() {
  const data = await withDb(
    async () => {
      const [services, routes, destinations, faqs, vehicles] = await Promise.all([
        prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
        prisma.route.findMany({ where: { active: true } }),
        prisma.destination.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
        prisma.faq.findMany({ where: { published: true }, orderBy: { sortOrder: 'asc' } }),
        prisma.vehicle.findMany({ where: { active: true } }),
      ])
      return {
        source: 'database' as const,
        services,
        routes,
        destinations,
        faqs,
        vehicles,
        categories: SERVICE_CATEGORIES,
      }
    },
    () =>
      ({
        source: 'seed-fallback' as const,
        categories: SERVICE_CATEGORIES,
        services: TOURS.map((t) => ({
          slug: t.id,
          kind: 'TOUR',
          titleEn: t.title,
          blurbEn: t.blurb,
          imageUrl: t.img,
          hoursLabel: t.hours,
          paxLabel: t.pax,
          fromIsk: t.fromIsk,
        })),
        routes: AIRPORT_ROUTES.map((r) => ({
          fromLabel: r.from,
          toLabel: r.to,
          minutes: r.minutes,
          km: r.km,
          fromIsk: r.fromIsk,
        })),
        destinations: DESTINATIONS.map((d) => ({ name: d.name, note: d.note, imageUrl: d.img })),
        faqs: FAQS.map((f) => ({ questionEn: f.q, answerEn: f.a })),
        vehicles: FLEET.map((v) => ({ name: v.name, pax: v.pax, bags: v.bags, useCase: v.use })),
        note: 'DATABASE_URL unset or unreachable, serving design seed fallback.',
      }) as const,
  )

  return jsonOk({ ok: true, ...data })
}

export const GET = apiHandler(handleGET)
