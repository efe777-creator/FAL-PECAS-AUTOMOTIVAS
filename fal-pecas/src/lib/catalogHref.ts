/**
 * Encoder canônico de deep-link `/catalogo` (YMM + cat + vehicle=1).
 * Dono único — campanha, PDP, Home, garagem e buildVehicleQuery reusam daqui.
 * Fit continua só no RPC search_products (PVC); este módulo só monta URL.
 */

import type { VehicleFilter } from '@/types'

export const CATALOG_PATH = '/catalogo'

/** Limites de deep-link composto (campanha / URL). */
export const CATALOG_MULTI_CAT_MAX = 12
export const CATALOG_MULTI_MODEL_MAX = 12

export type CatalogVehicleFields = Pick<
  VehicleFilter,
  'maker' | 'model' | 'year' | 'engine' | 'version'
>

/** Normaliza lista CSV (vírgula / + / espaço) com teto e dedupe. */
export function normalizeCatalogCsvList(
  raw: string | string[] | null | undefined,
  max: number,
): string[] {
  const parts = Array.isArray(raw)
    ? raw
    : String(raw ?? '')
        .split(/[,+\s]+/)
        .map((s) => s.trim())
  const out: string[] = []
  const seen = new Set<string>()
  for (const p of parts) {
    if (!p) continue
    const key = p.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
    if (out.length >= max) break
  }
  return out
}

export function parseCatalogCsvParam(
  raw: string | null | undefined,
  max: number,
): string[] {
  return normalizeCatalogCsvList(raw, max)
}

export function joinCatalogCsv(values: string[]): string {
  return values.map((v) => v.trim()).filter(Boolean).join(',')
}

/**
 * Acrescenta maker/model/year/engine/version + `vehicle=1` quando houver qualquer campo.
 * `model` pode ser CSV (vários modelos, mesmo maker).
 */
export function appendCatalogVehicleParams(
  q: URLSearchParams,
  filter?: CatalogVehicleFields | null,
): void {
  if (!filter) return
  const maker = filter.maker?.trim()
  const modelRaw = filter.model?.trim()
  const models = modelRaw
    ? normalizeCatalogCsvList(modelRaw, CATALOG_MULTI_MODEL_MAX)
    : []
  const year =
    filter.year != null && String(filter.year).trim()
      ? String(filter.year).trim()
      : ''
  const engine = filter.engine?.trim()
  const version = filter.version?.trim()

  if (maker) q.set('maker', maker)
  if (models.length) q.set('model', joinCatalogCsv(models))
  if (year) q.set('year', year)
  if (engine) q.set('engine', engine)
  if (version) q.set('version', version)

  if (maker || models.length || year || engine || version) {
    q.set('vehicle', '1')
  }
}

/** Acrescenta `cat` (slug único ou CSV de até CATALOG_MULTI_CAT_MAX). */
export function appendCatalogCategoryParams(
  q: URLSearchParams,
  categorySlug?: string | string[] | null,
): void {
  if (categorySlug == null) return
  const cats = normalizeCatalogCsvList(categorySlug, CATALOG_MULTI_CAT_MAX)
  if (cats.length) q.set('cat', joinCatalogCsv(cats))
}

/** Monta pathname+query `/catalogo?...`. */
export function buildCatalogHref(opts: {
  categorySlug?: string | string[] | null
  filter?: CatalogVehicleFields | null
  /** Params extras (ids, promo, q, sort…) — aplicados depois. */
  extra?: Record<string, string | null | undefined>
}): string {
  const q = new URLSearchParams()
  appendCatalogCategoryParams(q, opts.categorySlug)
  appendCatalogVehicleParams(q, opts.filter)
  if (opts.extra) {
    for (const [k, v] of Object.entries(opts.extra)) {
      const t = v?.trim()
      if (t) q.set(k, t)
    }
  }
  const qs = q.toString()
  return qs ? `${CATALOG_PATH}?${qs}` : CATALOG_PATH
}
