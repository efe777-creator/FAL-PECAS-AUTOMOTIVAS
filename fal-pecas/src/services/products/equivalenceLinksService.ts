import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/** IDs de equivalentes técnicos ativos (loja / M32 futuro). */
export async function listEquivalentProductIds(productId: string): Promise<string[]> {
  if (!productId || !isSupabaseConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('product_equivalences')
    .select('equivalent_product_id')
    .eq('product_id', productId)
    .eq('active', true)
  if (error) throw error
  return (data ?? []).map((r) => String(r.equivalent_product_id))
}
