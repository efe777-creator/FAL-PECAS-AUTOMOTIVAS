import type { Product } from '@/types'

export const RELATED_PRODUCTS_LIMIT = 4
/** Máximo de links curados por produto no admin. */
export const RELATED_PRODUCTS_CURATED_MAX = 8

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

/**
 * Curadoria primeiro (ordem do admin); completa com fallback de categoria.
 * Não duplica IDs; exclui o produto atual.
 */
export function mergeRelatedProducts(
  curated: Product[],
  fallback: Product[],
  opts: { excludeId: string; limit?: number },
): Product[] {
  const limit = opts.limit ?? RELATED_PRODUCTS_LIMIT
  if (limit <= 0) return []
  const seen = new Set<string>([opts.excludeId])
  const out: Product[] = []
  for (const p of curated) {
    if (!p.id || seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
    if (out.length >= limit) return out
  }
  for (const p of pickRelatedProducts(fallback, { excludeId: opts.excludeId, limit })) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
    if (out.length >= limit) break
  }
  return out
}
