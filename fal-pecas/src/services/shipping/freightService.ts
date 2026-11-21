import {
  getCarrierByEnvKey,
  resolveCarrierProvider,
} from '@/services/shipping/carrierRegistry'
import type { ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

const CACHE_TTL_MS = 90_000

type CacheEntry = {
  at: number
  options: ShippingQuoteOption[]
}

const cache = new Map<string, CacheEntry>()

export function freightCacheKey(
  req: ShippingQuoteRequest,
  envKey?: string | null,
): string {
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
    envKey ?? 'active',
    req.originPostalCode ?? '',
    req.postalCode.replace(/\D/g, ''),
    req.state,
    req.city,
    (req.number ?? '').trim(),
    req.subtotal.toFixed(2),
    req.itemCount,
    req.totalWeightKg ?? '',
    items,
  ].join('::')
}

/**
 * Facade F6C: cache curto sobre ShippingProvider.
 * Usado pela cotação de envelope (PDP/carrinho). Nunca é verdade no place_order.
 */
export async function quoteFreight(
  req: ShippingQuoteRequest,
  opts?: { bypassCache?: boolean; envKey?: string | null },
): Promise<ShippingQuoteOption[]> {
  const envKey =
    opts?.envKey ??
    (import.meta.env.VITE_SHIPPING_PROVIDER as string | undefined) ??
    null
  const key = freightCacheKey(req, envKey)
  if (!opts?.bypassCache) {
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return hit.options
    }
  }
  const desc = getCarrierByEnvKey(envKey)
  const provider = resolveCarrierProvider(desc.envKey)
  const options = await provider.quote(req)
  cache.set(key, { at: Date.now(), options })
  return options
}

export function clearFreightCache() {
  cache.clear()
}
