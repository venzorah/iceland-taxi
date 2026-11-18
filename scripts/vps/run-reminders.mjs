// Dedicated timer: no tokens in curl arguments, URL query strings or logs.
const secret = process.env.CRON_SECRET
if (!secret) throw new Error('CRON_SECRET is required')
try {
 const result = await fetch('http://127.0.0.1:3000/api/cron/reminders', {
  headers:{authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(110000),redirect:'error',
 })
 if (!result.ok) throw new Error('Reminder job failed')
 console.log('Reminder job completed')
} catch { console.error('Reminder job failed; inspect protected email notice records'); process.exitCode=1 }
