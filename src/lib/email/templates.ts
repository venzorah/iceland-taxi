import { configuredAppUrl } from '@/lib/app-url'
import { EMAIL_LOGO_SRC } from './logo-email'

export const escapeEmailHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))

/** Only links belonging to the configured application may be used as email actions. */
export function emailAppUrl(path = '/') {
  const base = new URL(configuredAppUrl() || '')
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Email application URL is invalid')
  const url = new URL(path, base.origin)
  if (url.origin !== base.origin || url.username || url.password) throw new Error('Email action URL is invalid')
  return url.href
}

type Email = {
  title: string
  eyebrow?: string
  preheader?: string
  paragraphs: string[]
  facts?: { label: string; value: string; secret?: boolean }[]
  action?: { label: string; url: string }
  footer?: string
  companyName?: string
  /** Plain line phones use to offer the code above the keyboard, such as `@taxi.example #123456`. */
  autofill?: string
}

/** Table layout + inline styles for Gmail, Outlook and mobile; no scripts or fake clipboard buttons. */
export function styledEmail(input: Email) {
  const e = escapeEmailHtml
  const company = input.companyName || 'Iceland Taxi Booking'
  const footer = input.footer || 'Need a hand? Contact the Iceland Taxi Booking team.'
  const actionUrl = input.action ? emailAppUrl(input.action.url) : null
  const text = [input.title, ...input.paragraphs, ...(input.facts || []).map(fact => `${fact.label}: ${fact.value}`), ...(input.action ? [`${input.action.label}: ${actionUrl}`] : []), footer, company, input.autofill || ''].filter(Boolean).join('\n\n')
  const facts = input.facts?.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;margin:24px 0;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc">${input.facts.map(fact => `<tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0"><p style="margin:0 0 7px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">${e(fact.label)}</p><div ${fact.secret ? 'dir="ltr"' : ''} style="font-family:${fact.secret ? 'Consolas,monospace' : 'Arial,sans-serif'};font-size:${fact.secret ? '20' : '16'}px;line-height:1.5;color:#081d3d;word-break:break-all;${fact.secret ? 'user-select:all;-webkit-user-select:all' : 'user-select:text'}">${e(fact.value)}</div></td></tr>`).join('')}</table>` : ''
  const action = input.action && actionUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 20px"><tr><td bgcolor="#ffc400" style="border-radius:12px;text-align:center;mso-padding-alt:16px 26px"><a href="${e(actionUrl)}" style="display:inline-block;padding:16px 26px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;line-height:20px;color:#081d3d;text-decoration:none;border:1px solid #ffc400;border-radius:12px">${e(input.action.label)}</a></td></tr></table><p style="font-size:12px;line-height:1.7;color:#64748b;word-break:normal;overflow-wrap:anywhere">If the button does not open, copy this link into your browser:<br><a href="${e(actionUrl)}" style="color:#123b68;word-break:break-all">${e(actionUrl)}</a></p>` : ''
  return { text, html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e(input.title)}</title></head><body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#334155"><div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${e(input.preheader || input.title)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#eef2f7" style="table-layout:fixed"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;max-width:600px;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;background:#ffffff"><tr><td style="height:6px;background:#ffc400;font-size:0">&nbsp;</td></tr><tr><td bgcolor="#ffffff" style="padding:30px 28px 24px;border-bottom:1px solid #eef2f7;background-color:#ffffff"><img src="${EMAIL_LOGO_SRC}" alt="${e(company)}" width="180" height="70" border="0" style="display:block;width:180px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;background-color:#ffffff"></td></tr><tr><td style="padding:32px 28px"><p style="margin:0 0 12px;color:#64748b;font-size:11px;line-height:1.5;font-weight:700;letter-spacing:2px;text-transform:uppercase">${e(input.eyebrow || 'Iceland · Every journey matters')}</p><h1 style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:28px;line-height:1.25;letter-spacing:-0.5px;color:#081d3d">${e(input.title)}</h1>${input.paragraphs.map(paragraph => `<p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#475569">${e(paragraph).replace(/\n/g, '<br>')}</p>`).join('')}${facts}${action}${input.autofill ? `<p style="margin:16px 0 0;font-family:Consolas,monospace;font-size:12px;line-height:1.6;color:#64748b">${e(input.autofill)}</p>` : ''}</td></tr><tr><td style="padding:24px 28px;background:#081d3d"><p style="margin:0 0 8px;font-size:14px;font-weight:700;line-height:1.6;color:#ffffff">${e(company)}</p><p style="margin:0;font-size:12px;line-height:1.8;color:#cbd5e1">${e(footer)}</p></td></tr></table><p style="margin:20px 0 0;font-size:11px;line-height:1.7;color:#64748b">© ${new Date().getUTCFullYear()} ${e(company)}</p></td></tr></table></body></html>` }
}

export function authenticationCodeEmail(subject: string, code: string) {
  const reset = subject.toLowerCase().includes('password')
  const host = new URL(emailAppUrl('/')).hostname
  return styledEmail({
    title: reset ? 'Reset your password' : 'Your verification code',
    eyebrow: 'Account security',
    preheader: 'Your 6-digit code expires in 10 minutes.',
    paragraphs: [
      reset
        ? 'Use this code on the password reset screen to choose a new password.'
        : 'Enter this code to confirm your email address and finish setting up your account.',
      'This code expires in 10 minutes. If you did not request it, you can ignore this email.',
    ],
    facts: [{ label: 'Your code', value: code, secret: true }],
    autofill: `@${host} #${code}`,
    footer: 'Select the code to copy it. If you did not request this, leave the code unused and contact our team if you need help.',
  })
}

export function authenticationEmail(subject: string, link: string) {
  const reset = subject.startsWith('Reset ')
  const change = subject.startsWith('Approve ')
  return styledEmail({
    title: reset ? 'Choose a new password' : change ? 'Approve your email change' : 'Confirm your email address',
    eyebrow: 'Account security',
    preheader: reset ? 'Your secure password reset link is inside.' : 'One simple step to secure your account.',
    paragraphs: [reset ? 'We received a request to reset your password. Use the button below to choose a new one.' : change ? 'Confirm that you requested this change. Your new email address will also need to be verified.' : 'Confirm this email address to finish setting up your Iceland Taxi Booking account.', 'This security link expires in one hour.'],
    action: { label: reset ? 'Reset password' : change ? 'Approve email change' : 'Confirm email', url: link },
    footer: 'If you did not request this, leave the link unopened and contact our team if you need help.',
  })
}

export function driverLoginEmail(input: { name: string; email: string; password: string }) {
  return styledEmail({
    title: 'Your driver account is ready', eyebrow: 'Welcome to the driving team',
    preheader: 'Your driver sign-in details and portal link are inside.',
    paragraphs: [`Hello ${input.name}, operations has created your driver login. Use the email address and initial password below to sign in.`, 'Keep these details private. To choose your own password, use “Forgot password?” on the driver sign-in page. Access to assigned journeys is managed by operations.'],
    facts: [{ label: 'Email address', value: input.email }, { label: 'Initial password', value: input.password, secret: true }],
    action: { label: 'Sign in to the driver portal', url: emailAppUrl('/driver-login') },
    footer: 'Select the password text to copy it. Never share your password with anyone. Contact operations if you were not expecting this account.',
  })
}
