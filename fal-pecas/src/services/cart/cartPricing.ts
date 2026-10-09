import { resolveProductPrices } from '@/services/pricing/priceResolutionService'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { CartItem } from '@/types'

/**
 * FIND-006: alinha preços do carrinho à RPC canônica (mesma regra do place_order).
 * Itens sem resolução mantêm o preço anterior (não inventa valor).
 */
export async function applyResolvedPricesToCartItems(
  items: CartItem[],
  customerId?: string | null,
): Promise<CartItem[]> {
  if (!items.length || !isSupabaseConfigured) return items
  const cid = customerId === undefined ? await getCurrentCustomerId() : customerId
  const map = await resolveProductPrices(
    items.map((i) => i.productId),
    cid,
  )
  return items.map((item) => {
    const r = map.get(item.productId)
    if (!r) return item
    return { ...item, price: r.amount }
  })
}
