import nodemailer from 'nodemailer'

export type MailResult =
  | { ok: true }
  | { ok: false; message: string }

function fromAddress() {
  const configured = process.env.MAIL_FROM?.trim()
  if (configured) return configured
  const smtpUrl = process.env.SMTP_URL?.trim()
  if (!smtpUrl) return null
  try {
    const username = decodeURIComponent(new URL(smtpUrl).username || '')
    if (username.includes('@')) return username
  } catch {
    return null
  }
  return null
}

export function mailConfigError() {
  if (!process.env.SMTP_URL?.trim()) return 'SMTP_URL is not set'
  if (!fromAddress()) return 'MAIL_FROM is not set'
  return null
}

function transportOptions() {
  const url = new URL(process.env.SMTP_URL || '')
  const secure = url.protocol === 'smtps:'
  const port = url.port ? Number(url.port) : secure ? 465 : 587
  return {
    host: url.hostname,
    port,
    secure,
    auth: url.username
      ? { user: decodeURIComponent(url.username), pass: decodeURIComponent(url.password) }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  }
}

export async function sendMail(input: { to: string; subject: string; text: string; html: string; replyTo?: string | null }): Promise<MailResult> {
  const configError = mailConfigError()
  if (configError) return { ok: false, message: configError }
  const from = fromAddress()
  if (!from) return { ok: false, message: 'MAIL_FROM is not set' }
  try {
    const transport = nodemailer.createTransport(transportOptions())
    await transport.sendMail({
      from,
      to: input.to,
      replyTo: input.replyTo || undefined,
      subject: input.subject,
      text: input.text,
      html: input.html,
    })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email could not be sent'
    return { ok: false, message }
  }
}
