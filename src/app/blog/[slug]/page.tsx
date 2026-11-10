import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticlePageClient } from '@/components/screens/public/PublicPageClients'
import { resolveEditorial } from '@/lib/content/editorial-store'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await resolveEditorial('blog', slug)
  return { title: article?.title ?? 'Blog', description: article?.excerpt }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  if (!(await resolveEditorial('blog', slug))) notFound()
  return <ArticlePageClient kind="blog" slug={slug} />
}
