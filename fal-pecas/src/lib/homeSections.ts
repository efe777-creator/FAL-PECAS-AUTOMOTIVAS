/** Regras de composição das grades da Home (MVP / Onda 3 Comercial). */

/** Fallback se `store_home_settings` indisponível. */
export const HOME_FEATURED_LIMIT_DEFAULT = 16

/** @deprecated Use HOME_FEATURED_LIMIT_DEFAULT ou getFeaturedDisplayLimit(). */
export const HOME_FEATURED_LIMIT = HOME_FEATURED_LIMIT_DEFAULT

/** Teto de curadoria no admin (fila de produtos). */
export const ADMIN_FEATURED_MAX = 24

/** Limites do setting featured_display_limit. */
export const FEATURED_DISPLAY_LIMIT_MIN = 1
export const FEATURED_DISPLAY_LIMIT_MAX = 48

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
