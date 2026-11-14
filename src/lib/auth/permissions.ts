const content = ['services', 'routes', 'destinations', 'editorial', 'seo', 'theme', 'company']
const booking = ['drivers', 'vehicles', 'customers', 'enquiries', 'reminders', 'notifications']
export function canUseAdminModule(role: string, module: string) {
  if (role === 'SUPER_ADMIN') return true
  if (module === 'staff') return false
  if (module === 'payments') return role === 'FINANCE_MANAGER'
  if (module === 'pricing') return role === 'BOOKING_MANAGER' || role === 'FINANCE_MANAGER'
  if (content.includes(module)) return role === 'CONTENT_MANAGER'
  if (booking.includes(module)) return role === 'BOOKING_MANAGER' || role === 'STAFF'
  if (module === 'bookings') return role === 'BOOKING_MANAGER' || role === 'STAFF'
  return false
}
