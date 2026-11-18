import { Suspense } from 'react'
import { LoginForm } from '../login/LoginForm'
export const metadata = { title: 'Driver sign in', robots: { index: false } }
export default function Page() { return <Suspense fallback={<p className="p-8">Loading…</p>}><LoginForm portal="driver" /></Suspense> }
