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

/** CTA primário no card/PDP (MARCHA O1-G) — garante item no carrinho e vai a /carrinho. */
export const COMPRAR_AGORA_LABEL = 'Comprar agora'

/** CTA secundário no card/PDP — adiciona e permanece na tela. */
export const ADICIONAR_AO_CARRINHO_LABEL = 'Adicionar ao carrinho'

/** Seção PDP — atributos existentes (MARCHA PDP-A). */
export const ESPECIFICACOES_SECTION_LABEL = 'Especificações'

/** Seção PDP — texto comercial/técnico do cadastro. */
export const DESCRICAO_SECTION_LABEL = 'Descrição'

/** Orientação discreta para conferir aplicação (não substitui dados PVC). */
export const AJUDA_APLICACAO_TEXT =
  'Em dúvida se a peça serve? Confira o código, montadora, modelo, ano e versão do veículo.'

/** Descrição longa na PDP (MARCHA PDP-C). */
export const VER_DESCRICAO_COMPLETA_LABEL = 'Ver descrição completa'
export const VER_MENOS_DESCRICAO_LABEL = 'Ver menos'

/** Atalho para filtros de veículo no catálogo (não clona checker ML). */
export const FILTRAR_NO_CATALOGO_LABEL = 'Filtrar no catálogo'

/** Bloco PDP relacionados por categoria (MARCHA PDP-D / P3). */
export const RELACIONADOS_SECTION_LABEL = 'Produtos relacionados'
export const VER_MAIS_CATALOGO_LABEL = 'Ver mais no catálogo'

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
 * D2: preço resolvido. O preço riscado (promoção) é exibido à parte no card/PDP —
 * não prefixar "A partir de" para promoção (reservado a faixa min/max real de variação).
 */
export function formatStorePriceLabel(
  resolved: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _listPrice?: number | null,
  range?: { min: number; max: number } | null,
): string {
  if (range && range.max > range.min + 0.001) {
    return `A partir de ${formatMoney(range.min)}`
  }
  return formatMoney(resolved)
}
