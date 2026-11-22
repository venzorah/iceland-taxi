import assert from 'node:assert/strict'
import test from 'node:test'
import { traceCheckout, timed, diagnosticId, timingMarker } from './timing'
test('concurrent traces have opaque isolated IDs and closed numeric stage diagnostics', async () => {
  const original=console.info, logs: unknown[][]=[];console.info=(...args:unknown[])=>{logs.push(args)}
  try {
    const responses=await Promise.all([1,2].map(()=>traceCheckout(async()=>{
      const id=diagnosticId();timingMarker('oauth_cache_hit')
      await timed('teya_headers',async()=>{await new Promise(r=>setTimeout(r,3));assert.equal(diagnosticId(),id)})
      return new Response('private customer token and booking url', {status:502})
    })))
    assert.notEqual(responses[0].headers.get('X-Checkout-Diagnostic-ID'),responses[1].headers.get('X-Checkout-Diagnostic-ID'))
    const raw=JSON.stringify(logs);for(const secret of ['customer','token','booking url'])assert(!raw.includes(secret))
    for(const log of logs){const row=JSON.parse(String(log[1]));assert.equal(row.status,502);assert.match(row.diagnosticId,/^[a-f0-9-]{36}$/);assert(row.metrics.every((m:{ms:unknown})=>typeof m.ms==='number'))}
  } finally {console.info=original}
})
