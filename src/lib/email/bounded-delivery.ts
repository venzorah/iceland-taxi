/** Await every recipient, at most two SMTP operations at once; never fire-and-forget. */
export async function deliverBounded<T>(items: T[], deliver: (item: T) => Promise<void>) {
  let next = 0
  const errors: unknown[] = []
  await Promise.all(Array.from({ length: Math.min(2, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++]
      try { await deliver(item) } catch (error) { errors.push(error) }
    }
  }))
  if (errors.length) throw new Error('Notification delivery incomplete; private details suppressed.')
}
