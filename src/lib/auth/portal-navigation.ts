/** Browser-safe navigation only. Server permissions must still verify the account. */
export function portalNavigation(role: string | undefined, language: 'en' | 'is' = 'en') {
  const icelandic = language === 'is'
  if (role === 'CUSTOMER') return { kind: 'customer', href: '/account', label: icelandic ? 'Mín síða' : 'My account', roleLabel: icelandic ? 'Viðskiptavinur' : 'Customer' } as const
  if (role === 'DRIVER') return { kind: 'driver', href: '/driver', label: icelandic ? 'Bílstjórasvæði' : 'Driver portal', roleLabel: icelandic ? 'Bílstjóri' : 'Driver' } as const
  if (role && ['SUPER_ADMIN', 'BOOKING_MANAGER', 'FINANCE_MANAGER', 'CONTENT_MANAGER', 'STAFF'].includes(role)) {
    return { kind: 'admin', href: '/admin', label: icelandic ? 'Stjórnborð' : 'Admin portal', roleLabel: role === 'SUPER_ADMIN' ? 'Super Admin' : icelandic ? 'Starfsfólk' : 'Staff' } as const
  }
  return { kind: 'guest', href: '/login', label: icelandic ? 'Innskráning' : 'Sign in', roleLabel: '' } as const
}
