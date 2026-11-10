import { notFound, redirect } from 'next/navigation'

import { SEO_SLUG_PAGES } from '@/lib/content/editorial'

type Props = { params: Promise<{ slug: string }> }

export default async function Page({ params }: Props) {
  const { slug } = await params
  const page = SEO_SLUG_PAGES.find((item) => item.slug === slug && item.published)
  if (!page) notFound()
  redirect(page.href)
}
