import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { applicationOrigin } from './app-url'
import { middleware } from '../middleware'
import { GET as confirm } from '../app/auth/confirm/route'

test('public redirects use the runtime domain behind a loopback proxy', async () => {
  const previous = process.env.NEXT_PUBLIC_APP_URL
  try {
    process.env.NEXT_PUBLIC_APP_URL = 'https://icelandtaxibooking.is/'
    for (const [path, login] of [['/admin/services', '/admin-login'], ['/m', '/admin-login'], ['/driver', '/driver-login'], ['/account', '/login'], ['/messages', '/login']]) {
      const response = middleware(new NextRequest(`http://localhost:3000${path}`))
      const destination = new URL(response.headers.get('location')!)
      assert.equal(destination.origin, 'https://icelandtaxibooking.is')
      assert.equal(destination.pathname, login)
      assert.equal(destination.searchParams.get('next'), path)
    }
    const customer = await confirm(new Request('http://localhost:3000/auth/confirm'))
    assert.equal(customer.headers.get('location'), 'https://icelandtaxibooking.is/login?complete=1')
    const driver = await confirm(new Request('http://localhost:3000/auth/confirm?portal=driver&error=expired'))
    const destination = new URL(driver.headers.get('location')!)
    assert.equal(destination.origin, 'https://icelandtaxibooking.is')
    assert.equal(destination.pathname, '/driver-login')
    assert.equal(destination.searchParams.get('error'), 'confirmation')
    assert.equal(destination.searchParams.get('next'), '/driver')
    process.env.NEXT_PUBLIC_APP_URL = 'https://runtime.example'
    assert.equal(applicationOrigin('http://localhost:3000/account'), 'https://runtime.example')
    delete process.env.NEXT_PUBLIC_APP_URL
    assert.equal(applicationOrigin('http://localhost:3000/account'), 'http://localhost:3000')
    for (const value of ['javascript:alert(1)', 'https://user:password@example.test', 'invalid-domain']) {
      process.env.NEXT_PUBLIC_APP_URL = value
      assert.throws(() => applicationOrigin('http://localhost:3000'))
    }
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = previous
  }
})
