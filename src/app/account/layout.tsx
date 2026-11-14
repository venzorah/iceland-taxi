import { requirePortal } from '@/lib/auth/page-access'
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePortal('customer')
  return children
}
