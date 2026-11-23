import type { ProductSearchParams } from '@/types'
import type { SearchIntent } from './interpretSearchQuery'

export function buildCatalogSearchParams(intent: SearchIntent): {
  searchParams: URLSearchParams
  catalogParams: ProductSearchParams
} {
  const sp = new URLSearchParams()
  const catalogParams: ProductSearchParams = {}

  const qFinal = intent.productQuery ?? intent.codeHint ?? null
  if (qFinal) {
    sp.set('q', qFinal)
    catalogParams.q = qFinal
  }

  const v = intent.vehicle
  if (v.maker) {
    sp.set('maker', v.maker)
    catalogParams.maker = v.maker
  }
  if (v.model) {
    sp.set('model', v.model)
    catalogParams.model = v.model
  }
  if (v.year) {
    sp.set('year', v.year)
    catalogParams.year = v.year
  }
  if (v.engine) {
    sp.set('engine', v.engine)
    catalogParams.engine = v.engine
  }
  if (v.version) {
    sp.set('version', v.version)
    catalogParams.version = v.version
  }
  if (v.maker || v.model || v.year || v.engine || v.version) {
    sp.set('vehicle', '1')
  }

  return { searchParams: sp, catalogParams }
}

function intentHasVehicleParams(p: ProductSearchParams): boolean {
  return Boolean(
    p.maker?.trim() ||
      p.model?.trim() ||
      p.year?.trim() ||
      p.engine?.trim() ||
      p.version?.trim(),
  )
}

/**
 * Merge params de listagem com intent derivado de `q`.
 * Se o intent carrega veículo, ele vence YMM stale (Palio + q=I30 → i30).
 * Só-texto: preserva filtros YMM existentes e aplica `q` do intent.
 */
export function applyIntentToSearchParams(
  params: ProductSearchParams,
  catalogParams: ProductSearchParams,
): ProductSearchParams {
  if (intentHasVehicleParams(catalogParams)) {
    return {
      ...params,
      maker: catalogParams.maker,
      model: catalogParams.model,
      year: catalogParams.year,
      engine: catalogParams.engine,
      version: catalogParams.version,
      q: catalogParams.q,
    }
  }
  return {
    ...params,
    q: catalogParams.q !== undefined ? catalogParams.q : params.q,
  }
}
