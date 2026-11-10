import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticlePageClient } from '@/components/screens/public/PublicPageClients'
import { findEditorial } from '@/lib/content/editorial'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = findEditorial('guide', slug)
  return { title: article?.title ?? 'Travel guides', description: article?.excerpt }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  if (!findEditorial('guide', slug)) notFound()
  return <ArticlePageClient kind="guide" slug={slug} />
}
