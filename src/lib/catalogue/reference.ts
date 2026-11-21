// Reviewed against https://iceland-taxi.vercel.app/api/listings and the supplied screenshots,
// 21 November 2026. Administrative restore data only; never a public listing fallback.
// Photos are already shipped under public/photos, and their URLs are persisted with the records.
export const REFERENCE_EUR_RATE = 150
export const REFERENCE_SERVICES = [
  { slug: 'airport-transfer', titleEn: 'Airport transfer', kind: 'AIRPORT', fromIsk: 14900, sortOrder: 1 },
  { slug: 'golden-circle', titleEn: 'Golden Circle Private Tour', kind: 'TOUR', fromIsk: 89900, hoursLabel: '7–8 h', paxLabel: 'Up to 8', blurbEn: 'Þingvellir, Geysir and Gullfoss at your own pace.', imageUrl: '/photos/golden-circle.jpg', sortOrder: 3 },
  { slug: 'south-coast', titleEn: 'South Coast Private Tour', kind: 'TOUR', fromIsk: 119900, hoursLabel: '10–11 h', paxLabel: 'Up to 8', blurbEn: 'Seljalandsfoss, Skógafoss and the black sands of Reynisfjara.', imageUrl: '/photos/south-coast.jpg', sortOrder: 4 },
  { slug: 'northern-lights', titleEn: 'Northern Lights Experience', kind: 'TOUR', fromIsk: 59900, hoursLabel: '3–4 h', paxLabel: 'Up to 8', blurbEn: 'Your driver follows the forecast away from city light.', imageUrl: '/photos/northern-lights.jpg', sortOrder: 5 },
  { slug: 'private-driver', titleEn: 'Private driver', kind: 'DRIVER', fromIsk: 24900, sortOrder: 6 },
] as const
export const REFERENCE_ROUTES = [
  { key: 'blue-lagoon', fromLabel: 'Keflavík Airport (KEF)', toLabel: 'Blue Lagoon', minutes: 20, km: 23, fromIsk: 14900 },
  { key: 'hotel-to-airport', fromLabel: 'Reykjavík hotel', toLabel: 'Keflavík Airport (KEF)', minutes: 45, km: 49, fromIsk: 22900 },
  { key: 'selfoss', fromLabel: 'Keflavík Airport (KEF)', toLabel: 'Selfoss', minutes: 75, km: 100, fromIsk: 39900 },
  { key: 'reykjavik', fromLabel: 'Keflavík Airport (KEF)', toLabel: 'Reykjavík city centre', minutes: 45, km: 49, fromIsk: 22900 },
] as const
