import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Product } from '@/types'

export interface ResolvedPrice {
  productId: string
  amount: number
  priceListId: string
  priceListSlug: string
  usedDefaultFallback: boolean
}

type ResolveRow = {
  product_id: string
  amount: number | string
  price_list_id: string
  price_list_slug: string
  used_default_fallback: boolean
}

function mapRow(row: ResolveRow): ResolvedPrice {
  return {
    productId: String(row.product_id),
    amount: Number(row.amount),
    priceListId: String(row.price_list_id),
    priceListSlug: String(row.price_list_slug),
    usedDefaultFallback: Boolean(row.used_default_fallback),
  }
}

/** Resolve preço comercial de um produto (RPC SECURITY DEFINER). */
export async function resolveProductPrice(
  productId: string,
  customerId?: string | null,
  at?: string | null,
): Promise<ResolvedPrice> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado')
  }
  const { data, error } = await supabase.rpc('resolve_product_price', {
    p_product_id: productId,
    p_customer_id: customerId ?? null,
    p_at: at ?? new Date().toISOString(),
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error(`Preço não resolvido para produto ${productId}`)
  return mapRow(row as ResolveRow)
}

/** Resolve preços em lote. Produtos sem preço ficam ausentes do mapa. */
export async function resolveProductPrices(
  productIds: string[],
  customerId?: string | null,
  at?: string | null,
): Promise<Map<string, ResolvedPrice>> {
  const map = new Map<string, ResolvedPrice>()
  if (!productIds.length) return map
  if (!isSupabaseConfigured || !supabase) return map

  const unique = [...new Set(productIds)]
  const { data, error } = await supabase.rpc('resolve_product_prices', {
    p_product_ids: unique,
    p_customer_id: customerId ?? null,
    p_at: at ?? new Date().toISOString(),
  })
  if (error) throw error
  for (const row of (data ?? []) as ResolveRow[]) {
    const resolved = mapRow(row)
    map.set(resolved.productId, resolved)
  }
  return map
}

const BASE_LIST_ID = 'a1111111-1111-1111-1111-111111111101'

/** Anexa resolvedPrice / listPrice / resolvedPriceListId aos produtos. */
export async function attachResolvedPrices(products: Product[]): Promise<Product[]> {
  if (!products.length) return products
  if (!isSupabaseConfigured || !supabase) {
    return products.map((p) => ({
      ...p,
      listPrice: p.price,
      resolvedPrice: p.promoPrice ?? p.price,
      resolvedPriceListId: null,
    }))
  }

  const resolved = await resolveProductPrices(products.map((p) => p.id))

  // listPrice = item da Base (espelho/legado)
  const { data: baseItems } = await supabase
    .from('price_list_items')
    .select('product_id, price')
    .eq('price_list_id', BASE_LIST_ID)
    .in(
      'product_id',
      products.map((p) => p.id),
    )

  const baseMap = new Map(
    (baseItems ?? []).map((r) => [String(r.product_id), Number(r.price)]),
  )

  return products.map((p) => {
    const r = resolved.get(p.id)
    const listPrice = baseMap.get(p.id) ?? p.price
    const resolvedPrice = r?.amount ?? p.promoPrice ?? p.price
    return {
      ...p,
      listPrice,
      resolvedPrice,
      resolvedPriceListId: r?.priceListId ?? null,
      // compat: promoPrice quando resolvido ≠ base
      promoPrice:
        resolvedPrice < listPrice - 0.001
          ? resolvedPrice
          : p.promoPrice != null && p.promoPrice < listPrice
            ? p.promoPrice
            : null,
      price: listPrice,
    }
  })
}

/** Preço de vitrine a partir do DTO (nunca reimplementa algoritmo de lista). */
export function displayPrice(product: Product): number {
  return product.resolvedPrice ?? product.promoPrice ?? product.price
}
