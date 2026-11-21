/**
 * Elegibilidade logística reversa Melhor Envio (D15–D18).
 * ME + volume único + pedido entregue + cart_item_id da ida.
 */

export type MeReverseEligibilityInput = {
  orderStatus: string
  provider?: string | null
  /** Volumes físicos a devolver (1 = elegível). */
  volumeCount: number
  /** UUID do envio ME original (cart_item_id / order id ME). */
  meOrderId?: string | null
}

export type MeReverseEligibility = {
  ok: boolean
  /** true só com cart_item_id com formato ME (não UUID sintético). */
  liveReady: boolean
  reason: string
  blockers: string[]
  liveBlockers: string[]
}

export function isMelhorEnvioProvider(provider: string | null | undefined): boolean {
  return String(provider ?? '')
    .toLowerCase()
    .includes('melhorenvio')
}

/** Conta volumes a partir de packing ou snapshot ME. */
export function countShipmentVolumes(metadata: Record<string, unknown> | null | undefined): number {
  if (!metadata || typeof metadata !== 'object') return 0
  const packing = metadata.packing as { volumes?: unknown } | undefined
  if (Array.isArray(packing?.volumes) && packing.volumes.length > 0) {
    return packing.volumes.length
  }
  const me = metadata.me as { volumes?: unknown } | undefined
  const vols = me?.volumes
  if (Array.isArray(vols)) return vols.length
  if (vols && typeof vols === 'object') {
    const packages = (vols as { packages?: unknown }).packages
    if (Array.isArray(packages) && packages.length > 0) return packages.length
    return 1
  }
  return 0
}

export function readMeCartItemId(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const me = metadata.me as { cart_item_id?: unknown; cart_id?: unknown } | undefined
  const id = String(me?.cart_item_id ?? me?.cart_id ?? '').trim()
  return id || null
}

/** ME cart/order id real costuma ser numérico; UUID = seed/smoke. */
export function looksSyntheticMeOrderId(meOrderId: string | null | undefined): boolean {
  const id = String(meOrderId ?? '').trim()
  if (!id) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export function evaluateMeReverseEligibility(input: MeReverseEligibilityInput): MeReverseEligibility {
  const blockers: string[] = []
  if (input.orderStatus !== 'entregue') blockers.push('order_not_delivered')
  if (!isMelhorEnvioProvider(input.provider)) blockers.push('provider_not_me')
  if (input.volumeCount <= 0) blockers.push('volume_unknown')
  else if (input.volumeCount !== 1) blockers.push('multi_volume')
  if (!String(input.meOrderId ?? '').trim()) blockers.push('me_order_id_missing')

  const liveBlockers = [...blockers]
  if (looksSyntheticMeOrderId(input.meOrderId)) liveBlockers.push('me_order_id_synthetic')

  if (blockers.length > 0) {
    const reason =
      blockers[0] === 'provider_not_me'
        ? 'Envio original não foi Melhor Envio — use WhatsApp ou devolução na loja.'
        : blockers[0] === 'multi_volume'
          ? 'Logística reversa ME só para volume único.'
          : blockers[0] === 'volume_unknown'
            ? 'Volumes do envio não encontrados — use WhatsApp ou devolução na loja.'
            : blockers[0] === 'me_order_id_missing'
              ? 'Falta referência do envio Melhor Envio original.'
              : 'Pedido precisa estar entregue para gerar código de devolução.'
    return { ok: false, liveReady: false, reason, blockers, liveBlockers }
  }

  if (liveBlockers.includes('me_order_id_synthetic')) {
    return {
      ok: true,
      liveReady: false,
      reason:
        'Elegível para modo ME (dry-run/smoke). Live exige cart_item_id numérico real da ida.',
      blockers,
      liveBlockers,
    }
  }

  return {
    ok: true,
    liveReady: true,
    reason: 'Elegível para código Melhor Envio (live).',
    blockers,
    liveBlockers,
  }
}
