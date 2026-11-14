/** Portal labels are navigation intent; only verified server role flags grant access. */
export function loginDestination(session: { staff: boolean; driver: boolean; user: { role: string } | null }, next: string | null, origin: string, driverIntent = false) {
  if (!session.user) return null
  if (driverIntent && !session.driver) return null
  const target = session.staff ? '/admin' : session.driver ? '/driver' : '/account'
  const allowed = session.staff ? ['/admin','/m'] : session.driver ? ['/driver'] : ['/account','/messages','/book','/manage-booking']
  if (!next) return target
  try { const destination = new URL(next,origin); return destination.origin === origin && allowed.some(p => destination.pathname === p || destination.pathname.startsWith(p+'/')) ? destination.href : target } catch { return target }
}
