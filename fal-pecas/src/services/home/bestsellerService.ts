import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { listPublishedProductsByIds } from '@/services/products/productService'
import type { Product } from '@/types'

export type BestsellerRankRow = {
  productId: string
  unitsSold: number
}

/**
 * Ordena IDs pelo ranking (unitsSold desc); IDs sem linha ficam no fim.
 * Puro — fácil de testar sem Supabase.
 */
export function orderIdsByBestsellerRank(
  ids: string[],
  ranks: BestsellerRankRow[],
): string[] {
  const score = new Map(ranks.map((r) => [r.productId, r.unitsSold]))
  return [...ids].sort((a, b) => {
    const sa = score.get(a) ?? -1
    const sb = score.get(b) ?? -1
    if (sb !== sa) return sb - sa
    return a.localeCompare(b)
  })
}

/** RPC store_bestseller_product_ids — vazio se migration ainda não aplicada. */
export async function listBestsellerRankRows(
  limit = 12,
  days = 90,
): Promise<BestsellerRankRow[]> {
  if (!isSupabaseConfigured || !supabase) return []
  const cap = Math.max(1, Math.min(48, Math.floor(limit)))
  const windowDays = Math.max(1, Math.min(365, Math.floor(days)))
  const { data, error } = await supabase.rpc('store_bestseller_product_ids', {
    p_limit: cap,
    p_days: windowDays,
  })
  if (error) {
    // Função ausente / RLS — não quebra a Home
    console.warn('[bestsellers]', error.message)
    return []
  }
  const rows = (data ?? []) as Array<{ product_id?: string; units_sold?: number | string }>
  return rows
    .map((r) => ({
      productId: String(r.product_id ?? ''),
      unitsSold: Number(r.units_sold) || 0,
    }))
    .filter((r) => r.productId)
}

export async function listBestsellerProducts(
  limit = 12,
  days = 90,
): Promise<Product[]> {
  const ranks = await listBestsellerRankRows(limit, days)
  if (!ranks.length) return []
  const ids = ranks.map((r) => r.productId)
  const products = await listPublishedProductsByIds(ids)
  const orderedIds = orderIdsByBestsellerRank(
    products.map((p) => p.id),
    ranks,
  )
  const byId = new Map(products.map((p) => [p.id, p]))
  return orderedIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p))
}
