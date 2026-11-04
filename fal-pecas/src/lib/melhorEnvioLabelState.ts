/**
 * Ciclo da etiqueta Melhor Envio — separado do status comercial do pedido.
 * Persistido em shipments.metadata.me (sem novos orders.status).
 */

export type MeLabelState =
  | 'none'
  | 'quoted'
  | 'prepared'
  | 'cart'
  | 'purchased'
  | 'generated'
  | 'printed'

export type MeShipmentMeta = {
  label_state?: MeLabelState
  cart_item_id?: string | null
  protocol?: string | null
  tracking?: string | null
  label_url?: string | null
  service_id?: string | number | null
  label_amount?: number | null
  volumes?: unknown
  last_error?: string | null
  checkout_snapshot_ref?: string | null
  quoted_amount?: number | null
  divergence?: {
    chargedShipping: number
    labelAmount: number
    delta: number
    blocked: boolean
    reason?: string
  } | null
}

export const ME_LABEL_STATE_ORDER: readonly MeLabelState[] = [
  'none',
  'quoted',
  'prepared',
  'cart',
  'purchased',
  'generated',
  'printed',
] as const

export function parseMeMeta(metadata: Record<string, unknown> | null | undefined): MeShipmentMeta {
  if (!metadata || typeof metadata !== 'object') return {}
  const raw = metadata.me
  if (!raw || typeof raw !== 'object') return {}
  return raw as MeShipmentMeta
}

export function meLabelState(metadata: Record<string, unknown> | null | undefined): MeLabelState {
  const me = parseMeMeta(metadata)
  const s = me.label_state
  if (
    s === 'quoted' ||
    s === 'prepared' ||
    s === 'cart' ||
    s === 'purchased' ||
    s === 'generated' ||
    s === 'printed'
  ) {
    return s
  }
  return 'none'
}

export function meLabelStateLabel(state: MeLabelState): string {
  switch (state) {
    case 'none':
      return 'Etiqueta ainda não comprada'
    case 'quoted':
      return 'Cotação de etiqueta'
    case 'prepared':
      return 'Pronto para emitir (pagamento aprovado)'
    case 'cart':
      return 'No carrinho Melhor Envio'
    case 'purchased':
      return 'Etiqueta comprada'
    case 'generated':
      return 'Etiqueta gerada'
    case 'printed':
      return 'Etiqueta impressa'
  }
}

/** Compra/geração de etiqueta NÃO implica ship_order. */
export function canPurchaseLabel(orderStatus: string, labelState: MeLabelState): boolean {
  if (orderStatus !== 'pronto_para_envio' && orderStatus !== 'preparando_envio') return false
  return (
    labelState === 'none' ||
    labelState === 'quoted' ||
    labelState === 'prepared' ||
    labelState === 'cart'
  )
}

export function canShipAfterLabel(orderStatus: string): boolean {
  return orderStatus === 'pronto_para_envio' || orderStatus === 'preparando_envio'
}

export type FreightDivergence = {
  chargedShipping: number
  labelAmount: number
  delta: number
  blocked: boolean
  reason: string
}

/**
 * Divergência de frete: bloqueia compra se preço da etiqueta diverge do cobrado
 * além da tolerância (centavos). Não cobra cliente automaticamente.
 */
export function evaluateFreightDivergence(input: {
  chargedShipping: number
  labelAmount: number
  tolerance?: number
  serviceAvailable?: boolean
}): FreightDivergence {
  const tolerance = input.tolerance ?? 0.01
  if (input.serviceAvailable === false) {
    return {
      chargedShipping: input.chargedShipping,
      labelAmount: input.labelAmount,
      delta: input.labelAmount - input.chargedShipping,
      blocked: true,
      reason: 'Serviço de frete indisponível no Melhor Envio no momento da compra.',
    }
  }
  const delta = Number((input.labelAmount - input.chargedShipping).toFixed(2))
  const blocked = Math.abs(delta) > tolerance
  return {
    chargedShipping: input.chargedShipping,
    labelAmount: input.labelAmount,
    delta,
    blocked,
    reason: blocked
      ? `Valor da etiqueta (${input.labelAmount.toFixed(2)}) difere do frete cobrado do cliente (${input.chargedShipping.toFixed(2)}). Compra bloqueada — sem cobrança automática.`
      : 'Valores alinhados.',
  }
}

export function mergeMeMetadata(
  existing: Record<string, unknown> | null | undefined,
  patch: MeShipmentMeta,
): Record<string, unknown> {
  const base = { ...(existing ?? {}) }
  const prev = parseMeMeta(existing)
  base.me = { ...prev, ...patch }
  return base
}

/** Idempotência: não recomprar se já purchased+ */
export function alreadyPurchased(state: MeLabelState): boolean {
  return state === 'purchased' || state === 'generated' || state === 'printed'
}

export function alreadyGenerated(state: MeLabelState): boolean {
  return state === 'generated' || state === 'printed'
}
