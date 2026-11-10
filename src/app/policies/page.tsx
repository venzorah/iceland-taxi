import type { Metadata } from 'next'
import { PoliciesPageClient } from '@/components/screens/public/PublicPageClients'
import type { PolicyId } from '@/components/screens/public/Policies'

export const metadata: Metadata = {
  title: 'Policies',
  description: 'Privacy, terms, cancellation and refund policies.',
}

const ALLOWED: PolicyId[] = ['privacy', 'terms', 'cancellation', 'refund']

type Props = { searchParams: Promise<{ policy?: string }> }

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams
  const policy = ALLOWED.includes(sp.policy as PolicyId) ? (sp.policy as PolicyId) : 'privacy'
  return <PoliciesPageClient policy={policy} />
}
