import { quoteShipping as quoteViaActiveProvider } from '@/services/shipping/shippingService'
import type { ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

const CACHE_TTL_MS = 90_000

type CacheEntry = {
  at: number
  options: ShippingQuoteOption[]
}

const cache = new Map<string, CacheEntry>()

function stableKey(req: ShippingQuoteRequest): string {
  const items = (req.items ?? [])
    .map((i) =>
      [
        i.productId,
        i.quantity,
        i.weightKg ?? '',
        i.heightCm ?? '',
        i.widthCm ?? '',
        i.lengthCm ?? '',
      ].join(':'),
    )
    .sort()
    .join('|')
  return [
    req.originPostalCode ?? '',
    req.postalCode.replace(/\D/g, ''),
    req.state,
    req.city,
    req.subtotal.toFixed(2),
    req.itemCount,
    req.totalWeightKg ?? '',
    items,
  ].join('::')
}

/** Facade F6C: cache curto sobre ShippingProvider. Nunca é verdade no place_order. */
export async function quoteFreight(
  req: ShippingQuoteRequest,
  opts?: { bypassCache?: boolean },
): Promise<ShippingQuoteOption[]> {
  const key = stableKey(req)
  if (!opts?.bypassCache) {
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return hit.options
    }
  }
  const options = await quoteViaActiveProvider(req)
  cache.set(key, { at: Date.now(), options })
  return options
}

export function clearFreightCache() {
  cache.clear()
}
