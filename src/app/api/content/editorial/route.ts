import { apiHandler, jsonOk } from '@/lib/api'
import { listEditorial } from '@/lib/content/editorial-store'

async function handleGET(req: Request) {
  const kind = new URL(req.url).searchParams.get('kind')
  const posts = await listEditorial(kind === 'blog' || kind === 'guide' ? kind : undefined)
  return jsonOk({ ok: true, posts: posts.filter((post) => post.published) })
}

export const GET = apiHandler(handleGET)
