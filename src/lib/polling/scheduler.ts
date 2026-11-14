export type PollResult = { stop?: boolean; retryAfterMs?: number } | void

/** Schedule after completion, never on an interval. Errors progressively reduce load. */
export function startPolling(task: (signal: AbortSignal) => Promise<PollResult>, options: {
  intervalMs?: number; maxDelayMs?: number; timeoutMs?: number; active?: () => boolean
} = {}) {
  const interval = options.intervalMs ?? 10000
  const maxDelay = options.maxDelayMs ?? 120000
  let stopped = false
  let running = false
  let failures = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let request: AbortController | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  async function run() {
    if (stopped || running) return
    if (options.active && !options.active()) { timer = setTimeout(run, interval); return }
    running = true
    request = new AbortController()
    timeout = setTimeout(() => request?.abort(), options.timeoutMs ?? 20000)
    let delay = interval
    try {
      const result = await task(request.signal)
      failures = 0
      if (result?.stop) stopped = true
      delay = Math.max(interval, result?.retryAfterMs ?? 0)
    } catch {
      failures++
      delay = Math.min(maxDelay, interval * 2 ** Math.min(failures, 6))
    } finally {
      clearTimeout(timeout)
      running = false
      if (!stopped) timer = setTimeout(run, delay)
    }
  }
  void run()
  return {
    refresh() { if (!stopped && !running && failures === 0) { clearTimeout(timer); void run() } },
    stop() { stopped = true; clearTimeout(timer); clearTimeout(timeout); request?.abort() },
  }
}
