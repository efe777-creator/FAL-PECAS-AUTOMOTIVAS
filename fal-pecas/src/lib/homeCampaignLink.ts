/**
 * Notes #18 — destino do CTA de campanha Home → catálogo filtrado.
 * Codifica tudo no `href` (sem migration): cat, ids, veículo.
 */

export type CampaignLinkKind = 'catalog' | 'category' | 'products' | 'vehicle' | 'manual'

export type CampaignLinkVehicle = {
  maker?: string | null
  model?: string | null
  year?: string | null
  engine?: string | null
  version?: string | null
}

export type CampaignLinkInput = {
  kind: CampaignLinkKind
  /** Slug de categoria / grupo / subgrupo (`?cat=`). */
  categorySlug?: string | null
  /** IDs de produtos publicados (1+). */
  productIds?: string[]
  vehicle?: CampaignLinkVehicle | null
  /** Só para kind=manual — href livre. */
  manualHref?: string | null
}

const MAX_PRODUCT_IDS = 40

/** Normaliza lista de IDs a partir de string ou array. */
export function normalizeCampaignProductIds(
  raw: string | string[] | null | undefined,
): string[] {
  const parts = Array.isArray(raw)
    ? raw
    : String(raw ?? '')
        .split(/[,+\s]+/)
        .map((s) => s.trim())
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of parts) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= MAX_PRODUCT_IDS) break
  }
  return out
}

export function parseCatalogProductIdsParam(raw: string | null | undefined): string[] {
  return normalizeCampaignProductIds(raw)
}

/**
 * Monta `/catalogo?...` a partir do destino estruturado da campanha.
 */
export function buildCampaignCatalogHref(input: CampaignLinkInput): string {
  if (input.kind === 'manual') {
    const href = input.manualHref?.trim()
    return href || '/catalogo'
  }
  if (input.kind === 'catalog') return '/catalogo'

  const q = new URLSearchParams()

  if (input.kind === 'category') {
    const cat = input.categorySlug?.trim()
    if (cat) q.set('cat', cat)
  }

  if (input.kind === 'products') {
    const ids = normalizeCampaignProductIds(input.productIds)
    if (ids.length) q.set('ids', ids.join(','))
  }

  if (input.kind === 'vehicle' || input.kind === 'category') {
    const v = input.vehicle
    if (v?.maker?.trim()) q.set('maker', v.maker.trim())
    if (v?.model?.trim()) q.set('model', v.model.trim())
    if (v?.year != null && String(v.year).trim()) q.set('year', String(v.year).trim())
    if (v?.engine?.trim()) q.set('engine', v.engine.trim())
    if (v?.version?.trim()) q.set('version', v.version.trim())
    if (
      v?.maker?.trim() ||
      v?.model?.trim() ||
      (v?.year != null && String(v.year).trim()) ||
      v?.engine?.trim() ||
      v?.version?.trim()
    ) {
      q.set('vehicle', '1')
    }
  }

  // category + vehicle já misturados acima; se só category sem cat, cai no catálogo
  const qs = q.toString()
  return qs ? `/catalogo?${qs}` : '/catalogo'
}

/**
 * Infere o tipo a partir de um href salvo (edição admin).
 * Heurística — href livre vira `manual` se não casar padrões.
 */
export function inferCampaignLinkKind(href: string | null | undefined): CampaignLinkKind {
  const raw = (href ?? '').trim()
  if (!raw || raw === '/catalogo') return 'catalog'
  if (!raw.startsWith('/catalogo')) return 'manual'
  try {
    const u = new URL(raw, 'https://fal.local')
    if (u.searchParams.get('ids')?.trim()) return 'products'
    if (u.searchParams.get('maker')?.trim() || u.searchParams.get('model')?.trim()) {
      return u.searchParams.get('cat')?.trim() ? 'category' : 'vehicle'
    }
    if (u.searchParams.get('cat')?.trim()) return 'category'
    if ([...u.searchParams.keys()].length === 0) return 'catalog'
    return 'manual'
  } catch {
    return 'manual'
  }
}

/** Extrai campos estruturados de um href de campanha (best-effort). */
export function parseCampaignCatalogHref(href: string | null | undefined): CampaignLinkInput {
  const kind = inferCampaignLinkKind(href)
  const raw = (href ?? '').trim() || '/catalogo'
  if (kind === 'manual') return { kind, manualHref: raw }
  if (kind === 'catalog') return { kind: 'catalog' }
  try {
    const u = new URL(raw.startsWith('/') ? raw : `/${raw}`, 'https://fal.local')
    const vehicle: CampaignLinkVehicle = {
      maker: u.searchParams.get('maker'),
      model: u.searchParams.get('model'),
      year: u.searchParams.get('year'),
      engine: u.searchParams.get('engine'),
      version: u.searchParams.get('version'),
    }
    return {
      kind,
      categorySlug: u.searchParams.get('cat'),
      productIds: parseCatalogProductIdsParam(u.searchParams.get('ids')),
      vehicle,
      manualHref: raw,
    }
  } catch {
    return { kind: 'manual', manualHref: raw }
  }
}
