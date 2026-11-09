/**
 * Vocabulário oficial de preços / listas (DIV-001 B + FIND-011).
 * Item de lista NÃO tem active/inactive — só com preço / sem preço.
 */

export type PriceOriginCode = 'calculated' | 'imported' | 'manual'

/** Regra DIV-001: price > 0 = com preço. */
export function isPriceListItemPriced(price: number | null | undefined): boolean {
  return Number(price) > 0
}

export function priceListItemPricingStateLabel(
  price: number | null | undefined,
): 'Com preço' | 'Sem preço' {
  return isPriceListItemPriced(price) ? 'Com preço' : 'Sem preço'
}

/** Rótulo PT da origem D16 (UI operacional). */
export function priceOriginLabel(origin: PriceOriginCode | string): string {
  if (origin === 'calculated') return 'Calculado'
  if (origin === 'imported') return 'Importado'
  return 'Manual'
}

/** Separação de camadas — copy curto para admin. */
export const PRICE_LIST_LAYERS_HINT =
  'Lista Ativa/Inativa ≠ item Com preço/Sem preço ≠ produto disponível na loja.'

/** Prioridade da lista: desempate real em resolve_product_price (não remover). */
export const PRICE_LIST_PRIORITY_HINT =
  'Prioridade da lista: desempate do preço na loja (maior vence entre listas públicas ativas).'

export const PRICE_ORIGIN_VS_METHOD_HINT =
  'Origem do item (Calculado / Importado / Manual) ≠ método de formação da lista (Margem / Markup / Fixo).'
