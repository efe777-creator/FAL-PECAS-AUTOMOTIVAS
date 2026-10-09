import { displayCodigoReferencia } from '@/lib/productIdentity'
import { formatMoney } from '@/lib/money'

/** Rótulo operacional admin — valor em `products.commercial_ref` (fallback `sku`). */
export const CODIGO_REFERENCIA_LABEL = 'Código referência'

/** Rótulo vitrine (D1) — mesmo valor; copy do card/PDP. */
export const REFERENCIA_LABEL = 'Referência'

export const SKU_FAL_LABEL = 'SKU FAL'

/** Fabricante da peça (`product_brands`) — vitrine card/PDP. */
export const FABRICANTE_LABEL = 'Fabricante'

/** Sem PVC — copy oficial (não “sob consulta” genérico). */
export const APPS_EMPTY_LABEL = 'Sem aplicações cadastradas'

export const APLICACAO_SECTION_LABEL = 'Aplicação'

/** Controle discreto no card/PDP (MARCHA UI) — não compete com Ver produto. */
export const MAIS_APLICACOES_LABEL = 'Mais aplicações'
export const MENOS_APLICACOES_LABEL = 'Menos aplicações'

export const VER_PRODUTO_LABEL = 'Ver produto'

/** @deprecated Prefira passar o produto; mantido para callers que só têm string. */
export function formatCodigoReferencia(code: string): string {
  return `${CODIGO_REFERENCIA_LABEL}: ${code}`
}

export function formatCodigoReferenciaFromProduct(product: {
  commercialRef?: string | null
  sku: string
}): string {
  return `${CODIGO_REFERENCIA_LABEL}: ${displayCodigoReferencia(product)}`
}

/** Vitrine D1: `Referência: TRW1234`. */
export function formatReferenciaFromProduct(product: {
  commercialRef?: string | null
  sku: string
}): string {
  return `${REFERENCIA_LABEL}: ${displayCodigoReferencia(product)}`
}

/**
 * D2: prefixo “A partir de” só com variação real (lista > resolvido).
 */
export function formatStorePriceLabel(resolved: number, listPrice?: number | null): string {
  const money = formatMoney(resolved)
  if (listPrice != null && listPrice > resolved + 0.001) {
    return `A partir de ${money}`
  }
  return money
}
