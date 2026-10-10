import { getSupabase } from '@/lib/supabase'
import type { ShippingQuoteItem } from '@/types'

/** Busca peso/dimensões dos produtos do carrinho para cotação (sem inventar defaults). */
export async function loadCartLogistics(
  lines: Array<{ productId: string; quantity: number }>,
): Promise<ShippingQuoteItem[]> {
  if (!lines.length) return []
  const ids = [...new Set(lines.map((l) => l.productId))]
  const { data, error } = await getSupabase()
    .from('products')
    .select('id, weight_kg, height_cm, width_cm, length_cm')
    .in('id', ids)
  if (error) throw error
  const byId = new Map(
    (data ?? []).map((row) => [
      String(row.id),
      {
        weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
        heightCm: row.height_cm == null ? null : Number(row.height_cm),
        widthCm: row.width_cm == null ? null : Number(row.width_cm),
        lengthCm: row.length_cm == null ? null : Number(row.length_cm),
      },
    ]),
  )
  return lines.map((l) => {
    const dims = byId.get(l.productId)
    return {
      productId: l.productId,
      quantity: l.quantity,
      weightKg: dims?.weightKg ?? null,
      heightCm: dims?.heightCm ?? null,
      widthCm: dims?.widthCm ?? null,
      lengthCm: dims?.lengthCm ?? null,
    }
  })
}
