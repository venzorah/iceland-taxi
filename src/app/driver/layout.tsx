import { SessionBar } from '@/components/site/SessionBar'
import { requirePortal } from '@/lib/auth/page-access'
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requirePortal('driver')
  return <><SessionBar email={user.email} />{children}</>
}
