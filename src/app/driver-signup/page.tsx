import { notFound } from 'next/navigation'
export const metadata = { title: 'Page not found', robots: { index: false, follow: false } }
export default function Page() { notFound() }
