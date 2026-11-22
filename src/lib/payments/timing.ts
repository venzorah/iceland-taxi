import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
// Closed vocabulary: callers cannot attach arbitrary payloads, URLs, identities or errors.
type Stage = 'validation_auth' | 'booking_read' | 'booking_create' | 'catalogue' | 'vehicle' | 'rates' | 'availability_transaction' | 'notifications' | 'payment_prepare' | 'payment_write' | 'oauth' | 'oauth_wait' | 'oauth_cache_hit' | 'teya_headers' | 'teya_body' | 'total'
type Metric = { stage: Stage; ms: number }
type Trace = { id: string; started: number; metrics: Metric[] }
const context = new AsyncLocalStorage<Trace>()
export async function timed<T>(stage: Stage, work: () => Promise<T>): Promise<T> {
  const trace = context.getStore()
  if (!trace) return work()
  const start = performance.now()
  try { return await work() } finally { trace.metrics.push({ stage, ms: Math.round((performance.now() - start) * 10) / 10 }) }
}
export function timingMarker(stage: 'oauth_cache_hit') { context.getStore()?.metrics.push({ stage, ms: 0 }) }
export function diagnosticId() { return context.getStore()?.id }
export async function traceCheckout(work: () => Promise<Response>) {
  const trace: Trace = { id: randomUUID(), started: performance.now(), metrics: [] }
  return context.run(trace, async () => {
    let status = 500
    try {
      const response = await work(); status = response.status
      response.headers.set('X-Checkout-Diagnostic-ID', trace.id)
      // Total only in the browser; detailed timings stay in bounded server journals.
      response.headers.set('Server-Timing', `checkout;dur=${Math.round(performance.now() - trace.started)}`)
      return response
    } finally {
      trace.metrics.push({ stage: 'total', ms: Math.round((performance.now() - trace.started) * 10) / 10 })
      console.info('[checkout.timing]', JSON.stringify({ diagnosticId: trace.id, status, metrics: trace.metrics }))
    }
  })
}
