// Demo seed records shared by admin, driver and customer screens.
// In production these come from the bookings, drivers and conversations APIs.

export type BookingStatus =
  | 'Pending'
  | 'Awaiting Payment'
  | 'Confirmed'
  | 'Driver Assigned'
  | 'Acknowledged'
  | 'Driver En Route'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Refund Requested'
  | 'Refunded'

export type OpsBooking = {
  ref: string
  customer: string
  service: string
  route: string
  time: string
  pax: number
  vehicle: string
  driver: string | null
  amount: number
  currency: 'USD' | 'ISK' | 'EUR'
  status: BookingStatus
  flight?: string
}

export const TODAY_BOOKINGS: OpsBooking[] = [
  { ref: 'ITB-7K4Q2M', customer: 'Emma Larsen', service: 'Airport transfer', route: 'KEF → Hotel Borg', time: '15:30', pax: 2, vehicle: 'Standard Sedan', driver: null, amount: 166, currency: 'USD', status: 'Confirmed', flight: 'FI 615' },
  { ref: 'ITB-3HD8WN', customer: 'Jón Sigurðsson', service: 'Airport transfer', route: 'Garðabær → KEF', time: '06:10', pax: 1, vehicle: 'Comfort Sedan', driver: 'Gunnar H.', amount: 24900, currency: 'ISK', status: 'Completed' },
  { ref: 'ITB-9PL2XA', customer: 'Kenji Watanabe', service: 'Golden Circle Private Tour', route: 'Reykjavík → Golden Circle', time: '09:00', pax: 4, vehicle: 'SUV', driver: 'Sigrún B.', amount: 710, currency: 'USD', status: 'In Progress' },
  { ref: 'ITB-5RT7CV', customer: 'Sarah Mitchell', service: 'Northern Lights Experience', route: 'Reykjavík → Þingvellir', time: '21:30', pax: 3, vehicle: 'SUV', driver: 'Ari Þ.', amount: 434, currency: 'USD', status: 'Driver Assigned' },
  { ref: 'ITB-2MW6QE', customer: 'Anna Kowalska', service: 'Airport transfer', route: 'KEF → Blue Lagoon', time: '12:45', pax: 5, vehicle: 'Minivan', driver: 'Gunnar H.', amount: 195, currency: 'USD', status: 'Driver En Route', flight: 'W6 1471' },
  { ref: 'ITB-8NB4KS', customer: 'Helga Jónsdóttir', service: 'Private driver · 8 h', route: 'Akureyri pickup', time: '10:00', pax: 2, vehicle: 'Premium Sedan', driver: null, amount: 129900, currency: 'ISK', status: 'Awaiting Payment' },
  { ref: 'ITB-4QX1ZP', customer: 'Lucas Martin', service: 'Custom quotation', route: 'Ring Road · 5 days', time: '—', pax: 6, vehicle: 'Minibus', driver: null, amount: 0, currency: 'USD', status: 'Pending' },
]

export const DRIVERS = [
  { name: 'Gunnar H.', vehicle: 'Comfort Sedan · RX-482', status: 'On trip' },
  { name: 'Sigrún B.', vehicle: 'SUV · KL-115', status: 'On trip' },
  { name: 'Ari Þ.', vehicle: 'SUV · PT-903', status: 'Available' },
  { name: 'Katrín E.', vehicle: 'Minivan · MV-220', status: 'Available' },
  { name: 'Ólafur S.', vehicle: 'Premium Sedan · BS-771', status: 'Off duty' },
]

export const CONVERSATIONS = [
  { name: 'Emma Larsen', ref: 'ITB-7K4Q2M', last: 'Our flight is now landing 20 minutes early — is that okay?', time: '14:52', unread: 2 },
  { name: 'Lucas Martin', ref: 'ITB-4QX1ZP', last: 'Could we add Snæfellsnes on day 3?', time: '13:20', unread: 1 },
  { name: 'Helga Jónsdóttir', ref: 'ITB-8NB4KS', last: 'Takk! Ég greiði í kvöld.', time: '11:05', unread: 0 },
]

export function money(amount: number, currency: 'USD' | 'ISK' | 'EUR') {
  if (amount === 0) return 'Quote'
  const grouped = Math.round(amount).toLocaleString('en-US')
  if (currency === 'ISK') return `ISK ${grouped}`
  if (currency === 'EUR') return `€${grouped.replace(/,/g, '.')}`
  return `$${grouped}`
}

/** Status → token classes. Kept in one place so every surface reads the same. */
export function statusClass(s: BookingStatus) {
  switch (s) {
    case 'Completed':
      return 'bg-success/12 text-success'
    case 'Confirmed':
    case 'Driver Assigned':
    case 'Acknowledged':
      return 'bg-link/12 text-link'
    case 'Driver En Route':
    case 'In Progress':
      return 'bg-mint/15 text-mint-text'
    case 'Pending':
    case 'Awaiting Payment':
    case 'Refund Requested':
      return 'bg-primary/20 text-warning'
    default:
      return 'bg-error/12 text-error'
  }
}
