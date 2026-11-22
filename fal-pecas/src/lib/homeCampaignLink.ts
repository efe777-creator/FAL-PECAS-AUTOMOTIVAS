/**
 * Notes #18 — destino do CTA de campanha Home → catálogo filtrado.
 * Codifica no `href` (sem migration de banner): cat CSV, ids, veículo multi-model.
 * Encoder YMM/cat: `catalogHref` (dono canônico).
 * Regra: `ids` XOR filtro vivo (cats/YMM) — nunca os dois no mesmo `to`.
 */

import {
  buildCatalogHref,
  CATALOG_MULTI_CAT_MAX,
  CATALOG_MULTI_MODEL_MAX,
  joinCatalogCsv,
  normalizeCatalogCsvList,
  parseCatalogCsvParam,
} from '@/lib/catalogHref'

export type CampaignLinkKind =
  | 'catalog'
  | 'category'
  | 'products'
  | 'vehicle'
  | 'filter'
  | 'manual'

export type CampaignLinkVehicle = {
  maker?: string | null
  /** Um modelo ou CSV / lista (mesmo maker). */
  model?: string | null
  models?: string[] | null
  year?: string | null
  engine?: string | null
  version?: string | null
}

export type CampaignLinkInput = {
  kind: CampaignLinkKind
  /** Slug único (legado) ou lista. */
  categorySlug?: string | null
  categorySlugs?: string[] | null
  /** IDs de produtos publicados (1+) — exclusivo vs filtro. */
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

function resolveCategorySlugs(input: CampaignLinkInput): string[] {
  if (input.categorySlugs?.length) {
    return normalizeCatalogCsvList(input.categorySlugs, CATALOG_MULTI_CAT_MAX)
  }
  if (input.categorySlug?.trim()) {
    return normalizeCatalogCsvList(input.categorySlug, CATALOG_MULTI_CAT_MAX)
  }
  return []
}

function resolveModels(v?: CampaignLinkVehicle | null): string[] {
  if (!v) return []
  if (v.models?.length) return normalizeCatalogCsvList(v.models, CATALOG_MULTI_MODEL_MAX)
  if (v.model?.trim()) return normalizeCatalogCsvList(v.model, CATALOG_MULTI_MODEL_MAX)
  return []
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

  // Produtos curados: só ids (XOR filtro).
  if (input.kind === 'products') {
    const ids = normalizeCampaignProductIds(input.productIds)
    if (!ids.length) return '/catalogo'
    return buildCatalogHref({
      extra: { ids: ids.join(',') },
    })
  }

  const cats = resolveCategorySlugs(input)
  const models = resolveModels(input.vehicle)
  const maker = input.vehicle?.maker?.trim() || null
  const year = input.vehicle?.year != null ? String(input.vehicle.year).trim() : ''
  const engine = input.vehicle?.engine?.trim() || ''
  const version = input.vehicle?.version?.trim() || ''

  const useCats =
    input.kind === 'category' || input.kind === 'filter' || (input.kind === 'vehicle' && cats.length > 0)
  const useVehicle =
    input.kind === 'vehicle' ||
    input.kind === 'filter' ||
    (input.kind === 'category' && (maker || models.length || year || engine || version))

  return buildCatalogHref({
    categorySlug: useCats ? cats : null,
    filter: useVehicle
      ? {
          maker: maker || undefined,
          model: models.length ? joinCatalogCsv(models) : undefined,
          year: year || undefined,
          engine: engine || undefined,
          version: version || undefined,
        }
      : null,
  })
}

/**
 * Infere o tipo a partir de um href salvo (edição admin).
 * Heurística — href livre vira `manual` se não casar padrões.
 * `ids` domina (XOR). Multi cat+model → `filter`.
 */
export function inferCampaignLinkKind(href: string | null | undefined): CampaignLinkKind {
  const raw = (href ?? '').trim()
  if (!raw || raw === '/catalogo') return 'catalog'
  if (!raw.startsWith('/catalogo')) return 'manual'
  try {
    const u = new URL(raw, 'https://fal.local')
    if (u.searchParams.get('ids')?.trim()) return 'products'
    const cats = parseCatalogCsvParam(u.searchParams.get('cat'), CATALOG_MULTI_CAT_MAX)
    const models = parseCatalogCsvParam(u.searchParams.get('model'), CATALOG_MULTI_MODEL_MAX)
    const hasMaker = Boolean(u.searchParams.get('maker')?.trim())
    const hasVehicle = hasMaker || models.length > 0
    if (cats.length > 1 || (cats.length >= 1 && hasVehicle) || models.length > 1) {
      return 'filter'
    }
    if (hasVehicle) return 'vehicle'
    if (cats.length === 1) return 'category'
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
    const cats = parseCatalogCsvParam(u.searchParams.get('cat'), CATALOG_MULTI_CAT_MAX)
    const models = parseCatalogCsvParam(u.searchParams.get('model'), CATALOG_MULTI_MODEL_MAX)
    const vehicle: CampaignLinkVehicle = {
      maker: u.searchParams.get('maker'),
      model: models.length ? joinCatalogCsv(models) : null,
      models,
      year: u.searchParams.get('year'),
      engine: u.searchParams.get('engine'),
      version: u.searchParams.get('version'),
    }
    return {
      kind,
      categorySlug: cats[0] ?? null,
      categorySlugs: cats,
      productIds: parseCatalogProductIdsParam(u.searchParams.get('ids')),
      vehicle,
      manualHref: raw,
    }
  } catch {
    return { kind: 'manual', manualHref: raw }
  }
}
