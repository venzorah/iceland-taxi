import { FLEET, DESTINATIONS, FAQS, SERVICE_CATEGORIES } from '@/lib/design/data'
import { REFERENCE_ROUTES, REFERENCE_SERVICES } from '@/lib/catalogue/reference'
import { apiHandler, jsonOk, withDb, prisma } from '@/lib/api'

async function handleGET() {
  const data = await withDb(
    async () => {
      const [services, routes, destinations, faqs, vehicles] = await Promise.all([
        prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
        prisma.route.findMany({ where: { active: true } }),
        prisma.destination.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
        prisma.faq.findMany({ where: { published: true }, orderBy: { sortOrder: 'asc' } }),
        prisma.vehicle.findMany({ where: { active: true }, select: { id: true, name: true, category: true, pax: true, bags: true, useCase: true, upgradeIsk: true } }),
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
        services: REFERENCE_SERVICES.map((service) => ({
          slug: service.slug,
          kind: service.kind,
          titleEn: service.titleEn,
          blurbEn: service.blurbEn ?? null,
          imageUrl: service.imageUrl ?? null,
          hoursLabel: service.hoursLabel ?? null,
          paxLabel: service.paxLabel ?? null,
          fromIsk: service.fromIsk,
        })),
        routes: REFERENCE_ROUTES.map((route) => ({
          fromLabel: route.fromLabel,
          toLabel: route.toLabel,
          minutes: route.minutes,
          km: null,
          fromIsk: route.fromIsk,
          serviceSlug: route.serviceSlug,
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
