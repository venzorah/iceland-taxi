import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { emailLogoAttachment } from './logo-email'
import { authenticationCodeEmail, authenticationEmail, driverLoginEmail, styledEmail } from './templates'

const previous = process.env.NEXT_PUBLIC_APP_URL
afterEach(() => { if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = previous })

test('driver email includes selectable credentials and a real sign-in button, without credentials in links', () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://taxi.example'
  const mail = driverLoginEmail({ name: '<script>bad</script>', email: 'driver@example.test', password: 'Secret<&"123456789' })
  assert(mail.text.includes('Initial password: Secret<&"123456789'))
  assert(mail.html.includes('Secret&lt;&amp;&quot;123456789'))
  assert(mail.html.includes('href="https://taxi.example/driver-login"'))
  assert(mail.html.includes('user-select:all'))
  assert(mail.html.includes('role="presentation"'))
  assert(mail.html.includes('src="cid:iceland-taxi-logo"'))
  assert(mail.html.includes('bgcolor="#ffffff"'))
  assert.doesNotMatch(mail.html, /<script|onclick|<form|javascript:/)
  for (const link of mail.html.matchAll(/href="([^"]*)"/g)) assert.doesNotMatch(link[1], /Secret|driver@example|password=/)
})

test('verification, reset and email-change messages have styled action buttons and text fallbacks', () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://taxi.example'
  for (const [subject, label] of [['Reset your Iceland Taxi password', 'Reset password'], ['Confirm your Iceland Taxi email', 'Confirm email'], ['Approve your Iceland Taxi email change', 'Approve email change']]) {
    const mail = authenticationEmail(subject, 'https://taxi.example/api/auth/verify-email?token=fixture&callbackURL=%2Flogin')
    assert(mail.html.includes(label))
    assert(mail.html.includes('bgcolor="#ffc400"'))
    assert(mail.html.includes('token=fixture&amp;callbackURL='))
    assert(mail.text.includes('https://taxi.example/api/auth/verify-email?token=fixture&callbackURL='))
    assert(mail.html.includes('expires in one hour'))
  }
})

test('the logo travels inside the message on a white background', () => {
  const logo = emailLogoAttachment()
  assert.equal(logo.cid, 'iceland-taxi-logo')
  assert.equal(logo.content.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.ok(logo.content.length < 80_000)
})

test('verification codes include the site hint phones use to offer autofill', () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://taxi.example'
  const mail = authenticationCodeEmail('Your Iceland Taxi verification code', '123456')
  assert(mail.text.includes('Select the code to copy it.'))
  assert(mail.html.includes('user-select:all'))
  assert(mail.text.endsWith('@taxi.example #123456'))
  assert(mail.html.includes('@taxi.example #123456'))
  assert.doesNotMatch(mail.html, /<script|onclick|javascript:/)
})

test('notice content is escaped and foreign or unsafe action links are rejected', () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://taxi.example'
  const mail = styledEmail({ title: '<img src=x>', paragraphs: ['Customer & driver\nPickup: <script>bad</script>'], facts: [{ label: '<b>Code</b>', value: '1234<5678' }] })
  assert.doesNotMatch(mail.html, /<script>|<img src=x>|<b>Code<\/b>/)
  assert(mail.html.includes('Pickup: &lt;script&gt;bad&lt;/script&gt;'))
  for (const url of ['javascript:alert(1)', 'https://evil.example/reset', 'https://user:secret@taxi.example/reset']) assert.throws(() => styledEmail({ title: 'Reset', paragraphs: [], action: { label: 'Reset', url } }))
})
