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
