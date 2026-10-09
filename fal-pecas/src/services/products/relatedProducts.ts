import type { Product } from '@/types'

export const RELATED_PRODUCTS_LIMIT = 4

/**
 * Seleciona relacionados: exclui o produto atual; prefere disponíveis.
 * Sem aleatório / sem “quem viu” (MARCHA PDP-D / P3).
 */
export function pickRelatedProducts(
  candidates: Product[],
  opts: { excludeId: string; limit?: number },
): Product[] {
  const limit = opts.limit ?? RELATED_PRODUCTS_LIMIT
  if (limit <= 0) return []
  const filtered = candidates.filter((p) => p.id !== opts.excludeId)
  const available = filtered.filter((p) => p.available !== false)
  const unavailable = filtered.filter((p) => p.available === false)
  return [...available, ...unavailable].slice(0, limit)
}
