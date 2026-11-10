export function adminScreenAccess(session: { staff: boolean; driver: boolean }) {
  if (session.driver && !session.staff) return 'driver-blocked' as const
  return 'admin' as const
}
