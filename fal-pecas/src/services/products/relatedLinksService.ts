import { assertStoreBackendConfigured } from '@/lib/storeBackend'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/** IDs curados ativos, ordenados (loja / PDP). */
export async function listCuratedRelatedProductIds(productId: string): Promise<string[]> {
  assertStoreBackendConfigured()
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('product_related_links')
    .select('related_product_id')
    .eq('product_id', productId)
    .eq('active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => String(r.related_product_id))
}
