/**
 * Notes #13 — composição do trilho Promoções (gate + heurística + mix item/kit).
 */

export type PromoShelfItem = {
  id: string
  productKind?: string | null
}

/**
 * Prioriza produtos do gate ativo; completa com pool heurístico intercalando
 * itens e kits para não zerar um dos kinds.
 */
export function pickPromoHighlightShelf<T extends PromoShelfItem>(
  gateProducts: T[],
  heuristicPool: T[],
  limit: number,
  isPromo: (p: T) => boolean,
): T[] {
  const cap = Math.max(0, Math.floor(limit))
  if (cap === 0) return []

  const out: T[] = []
  const seen = new Set<string>()

  for (const p of gateProducts) {
    if (out.length >= cap) break
    if (!p?.id || seen.has(p.id) || !isPromo(p)) continue
    seen.add(p.id)
    out.push(p)
  }

  if (out.length >= cap) return out

  const fill = heuristicPool.filter((p) => p?.id && !seen.has(p.id) && isPromo(p))
  const kits = fill.filter((p) => p.productKind === 'kit')
  const items = fill.filter((p) => p.productKind !== 'kit')

  let i = 0
  let k = 0
  while (out.length < cap && (i < items.length || k < kits.length)) {
    if (i < items.length) {
      const p = items[i++]!
      if (!seen.has(p.id)) {
        seen.add(p.id)
        out.push(p)
      }
    }
    if (out.length >= cap) break
    if (k < kits.length) {
      const p = kits[k++]!
      if (!seen.has(p.id)) {
        seen.add(p.id)
        out.push(p)
      }
    }
  }

  return out
}
