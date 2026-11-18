import { Suspense } from 'react'
import { LoginForm } from '../login/LoginForm'
export const metadata = { title: 'Create customer account', robots: { index: false } }
export default function Page() { return <Suspense fallback={<p className="p-8">Loading…</p>}><LoginForm portal="customer" initialMode="register" /></Suspense> }
