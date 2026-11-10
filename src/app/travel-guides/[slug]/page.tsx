import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticlePageClient } from '@/components/screens/public/PublicPageClients'
import { resolveEditorial } from '@/lib/content/editorial-store'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await resolveEditorial('guide', slug)
  return { title: article?.title ?? 'Travel guides', description: article?.excerpt }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  if (!(await resolveEditorial('guide', slug))) notFound()
  return <ArticlePageClient kind="guide" slug={slug} />
}
