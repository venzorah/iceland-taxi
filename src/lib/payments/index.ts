import { teyaProvider } from './teya'
import type { PaymentProvider } from './types'

const providers: Record<string, PaymentProvider> = {
  teya: teyaProvider,
}

export function getPaymentProvider(id = process.env.PAYMENT_PROVIDER ?? 'teya'): PaymentProvider {
  const provider = providers[id]
  if (!provider) {
    throw new Error(`Unknown payment provider: ${id}. Registered: ${Object.keys(providers).join(', ')}`)
  }
  return provider
}

export * from './types'
export { teyaProvider }
