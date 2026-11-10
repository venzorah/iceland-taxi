import { BLOG_POSTS, TRAVEL_GUIDES, type Editorial } from '@/lib/content/editorial'
import { prisma } from '@/lib/prisma'

export type EditorialRecord = Editorial & {
  id: string | null
  kind: 'blog' | 'guide'
  published: boolean
  source: 'database' | 'seed'
}

function fromSeed(kind: 'blog' | 'guide', item: Editorial): EditorialRecord {
  return { ...item, id: null, kind, published: true, source: 'seed' }
}

export async function listEditorial(kind?: 'blog' | 'guide'): Promise<EditorialRecord[]> {
  const seeds = [
    ...(kind !== 'guide' ? BLOG_POSTS.map((item) => fromSeed('blog', item)) : []),
    ...(kind !== 'blog' ? TRAVEL_GUIDES.map((item) => fromSeed('guide', item)) : []),
  ]
  if (!process.env.DATABASE_URL) return seeds
  try {
    const rows = await prisma.editorialPost.findMany({
      where: kind ? { kind } : undefined,
      orderBy: { updatedAt: 'desc' },
    })
    const bySlug = new Map(rows.map((row) => [`${row.kind}:${row.slug}`, row]))
    const merged = seeds.map((item) => {
      const row = bySlug.get(`${item.kind}:${item.slug}`)
      if (!row) return item
      bySlug.delete(`${item.kind}:${item.slug}`)
      return rowToRecord(row)
    })
    for (const row of bySlug.values()) merged.unshift(rowToRecord(row))
    return merged
  } catch (error) {
    console.error(error instanceof Error ? error.name : 'editorial')
    return seeds
  }
}

export async function resolveEditorial(kind: 'blog' | 'guide', slug: string) {
  const items = await listEditorial(kind)
  return items.find((item) => item.slug === slug && item.published) ?? null
}

function rowToRecord(row: {
  id: string
  slug: string
  kind: string
  title: string
  excerpt: string
  body: string
  tag: string | null
  dateLabel: string | null
  minutes: string | null
  imageUrl: string | null
  published: boolean
}): EditorialRecord {
  return {
    id: row.id,
    kind: row.kind === 'guide' ? 'guide' : 'blog',
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body.split(/\n\n+/).filter(Boolean),
    tag: row.tag || '',
    date: row.dateLabel || '',
    minutes: row.minutes || '',
    img: row.imageUrl || '',
    published: row.published,
    source: 'database',
  }
}
