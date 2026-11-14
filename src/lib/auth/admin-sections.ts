import { canUseAdminModule } from './permissions'
const modules: Record<string, string> = { content: 'editorial', library: 'editorial', overview: 'bookings', messages: 'bookings', reports: 'payments', announcements: 'theme', appearance: 'theme', pages: 'editorial', languages: 'company', reviews: 'company', settings: 'company' }
export function canViewAdminSection(role: string, section: string) { return canUseAdminModule(role, modules[section] || section) }
export function initialAdminSection(role: string) { return role === 'FINANCE_MANAGER' ? 'payments' : role === 'CONTENT_MANAGER' ? 'services' : 'overview' }
