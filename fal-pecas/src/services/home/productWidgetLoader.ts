import {
  getProductWidgetDef,
  type ProductWidgetKind,
} from '@/lib/productWidgets'
import {
  listFeaturedProducts,
  listPromoHighlightProducts,
} from '@/services/products/productService'
import type { Product } from '@/types'

export type ProductWidgetLoadResult = {
  kind: ProductWidgetKind
  products: Product[]
  /** false = kind planned / sem fonte ainda. */
  implemented: boolean
}

/**
 * Carrega produtos de um widget.
 * `bestsellers` / `new_arrivals` / `campaign` → stub vazio até métricas/campanhas.
 */
export async function loadProductWidgetProducts(
  kind: ProductWidgetKind,
  limit?: number,
): Promise<ProductWidgetLoadResult> {
  const def = getProductWidgetDef(kind)
  const cap = Math.max(1, Math.floor(limit ?? def?.defaultLimit ?? 8))

  switch (kind) {
    case 'featured':
      return {
        kind,
        implemented: true,
        products: await listFeaturedProducts(cap),
      }
    case 'offers':
      return {
        kind,
        implemented: true,
        products: await listPromoHighlightProducts(cap),
      }
    case 'bestsellers':
    case 'new_arrivals':
    case 'campaign':
      return { kind, implemented: false, products: [] }
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}
