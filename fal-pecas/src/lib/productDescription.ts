/** Limiar para “Ver descrição completa” na PDP (MARCHA PDP-C). */
export const DESC_COLLAPSE_CHARS = 320

export function needsDescriptionCollapse(
  text: string,
  limit: number = DESC_COLLAPSE_CHARS,
): boolean {
  return text.trim().length > limit
}

/** Recorte em limite de caracteres, preferindo fronteira de palavra. */
export function truncateDescription(text: string, limit: number = DESC_COLLAPSE_CHARS): string {
  const t = text.trim()
  if (t.length <= limit) return t
  const slice = t.slice(0, limit)
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > limit * 0.6 ? slice.slice(0, lastSpace) : slice
  return `${cut.trimEnd()}…`
}

/** Junta short + long sem duplicar o mesmo texto. */
export function joinProductDescription(shortDesc: string, longDesc: string): string {
  const short = shortDesc.trim()
  const long = longDesc.trim()
  if (!short) return long
  if (!long || long === short) return short
  return `${short}\n\n${long}`
}

/** Link catálogo com filtro de montadora (quando houver app). */
export function buildCatalogMakerFilterHref(maker?: string | null): string {
  const m = maker?.trim()
  if (!m) return '/catalogo'
  return `/catalogo?maker=${encodeURIComponent(m)}`
}
