import type { VehicleFilter } from '@/types'

/** Limiar para “Ver descrição completa” na PDP (MARCHA PDP-C). */
export const DESC_COLLAPSE_CHARS = 320

/**
 * PDP / home → catálogo: preserva categoria + veículo ativo (Notes #9).
 * Sem inventar filtro — só repassa o que já está no contexto.
 */
export function buildCatalogBrowseHref(opts: {
  categorySlug?: string | null
  filter?: Pick<VehicleFilter, 'maker' | 'model' | 'year' | 'engine' | 'version'> | null
}): string {
  const q = new URLSearchParams()
  const cat = opts.categorySlug?.trim()
  if (cat) q.set('cat', cat)
  const f = opts.filter
  if (f?.maker?.trim()) q.set('maker', f.maker.trim())
  if (f?.model?.trim()) q.set('model', f.model.trim())
  if (f?.year != null && String(f.year).trim()) q.set('year', String(f.year).trim())
  if (f?.engine?.trim()) q.set('engine', f.engine.trim())
  if (f?.version?.trim()) q.set('version', f.version.trim())
  if (
    f?.maker?.trim() ||
    f?.model?.trim() ||
    (f?.year != null && String(f.year).trim()) ||
    f?.engine?.trim() ||
    f?.version?.trim()
  ) {
    q.set('vehicle', '1')
  }
  const qs = q.toString()
  return qs ? `/catalogo?${qs}` : '/catalogo'
}

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

/**
 * Atalho PDP → catálogo a partir das apps.
 * Só pré-filtra `maker` quando há **uma** montadora; com várias, abre o catálogo
 * sem viés da “primeira” da lista (copy alinhada).
 */
export function buildPdpCatalogFilterLink(makers: Array<string | null | undefined>): {
  href: string
  hint: string
} {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const raw of makers) {
    const m = raw?.trim()
    if (!m) continue
    const key = m.toLocaleLowerCase('pt-BR')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(m)
  }
  if (unique.length === 1) {
    const maker = unique[0]!
    return {
      href: buildCatalogMakerFilterHref(maker),
      hint: ` — outras peças da montadora ${maker}`,
    }
  }
  return {
    href: '/catalogo',
    hint: ' — outras peças no catálogo',
  }
}
