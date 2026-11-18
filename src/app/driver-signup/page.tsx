import { Suspense } from 'react'
import { LoginForm } from '../login/LoginForm'
export const metadata = { title: 'Activate driver account', robots: { index: false } }
export default function Page() { return <Suspense fallback={<p className="p-8">Loading…</p>}><LoginForm portal="driver" initialMode="register" /></Suspense> }
