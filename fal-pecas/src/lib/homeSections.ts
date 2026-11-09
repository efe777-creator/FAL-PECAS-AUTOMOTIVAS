/** Regras de composição das grades da Home (MVP / Onda 3 Comercial). */

/** Quantidade exibida na Home (até existir setting no banco). */
export const HOME_FEATURED_LIMIT = 16

/** Teto de curadoria no admin (sem hard cap fixo de 12). */
export const ADMIN_FEATURED_MAX = 24

/** Ofertas têm prioridade: remove da lista de destaques o que já aparece em ofertas. */
export function excludeProductsById<T extends { id: string }>(
  source: T[],
  exclude: Array<{ id: string }>,
): T[] {
  if (!source.length || !exclude.length) return source
  const ban = new Set(exclude.map((p) => p.id))
  return source.filter((p) => !ban.has(p.id))
}

/**
 * Ordenação híbrida de destaques:
 * 1) curados na ordem manual
 * 2) completa vagas com automáticos
 * 3) sem duplicar
 */
export function mergeFeaturedHybrid<T extends { id: string }>(
  curated: T[],
  automatic: T[],
  limit: number,
): T[] {
  const cap = Math.max(0, Math.floor(limit))
  if (cap === 0) return []
  const out: T[] = []
  const seen = new Set<string>()
  for (const item of curated) {
    if (out.length >= cap) break
    if (!item?.id || seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  for (const item of automatic) {
    if (out.length >= cap) break
    if (!item?.id || seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out
}
