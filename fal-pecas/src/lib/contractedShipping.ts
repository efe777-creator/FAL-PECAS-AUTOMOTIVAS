import { isOrderStorePickup, orderShippingKind } from '@/lib/orderShippingKind'

type ShipmentLike = {
  provider?: string | null
  service?: string | null
  carrier?: string | null
  amount?: number | null
  metadata?: Record<string, unknown> | null
} | null | undefined

export type ContractedShippingInfo = {
  label: string
  etaLabel: string | null
  etaDaysMin: number | null
  etaDaysMax: number | null
  serviceCode: string | null
  optionId: string | null
  pickup: boolean
  modality: string
  chargedAmount: number | null
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s ? s : null
}

/** Formata prazo congelado na compra (dias úteis). */
export function formatContractedEtaDays(
  min: number | null,
  max: number | null,
  opts?: { pickup?: boolean },
): string | null {
  if (opts?.pickup) {
    if (min == null && max == null) return 'Retirada na loja'
    if ((min ?? 0) === 0 && (max ?? 0) === 0) return 'Retirada na loja'
  }
  if (min == null && max == null) return null
  if (min != null && max != null) {
    if (min === max) {
      if (min === 0) return 'No mesmo dia (útil)'
      return min === 1 ? '1 dia útil' : `${min} dias úteis`
    }
    return `${min}–${max} dias úteis`
  }
  const only = min ?? max
  if (only == null) return null
  if (only === 0) return 'No mesmo dia (útil)'
  return only === 1 ? '1 dia útil' : `${only} dias úteis`
}

/**
 * Frete/prazo que o cliente escolheu no checkout (snapshot em shipments.metadata).
 * Não usa cotação interna posterior nem packing.
 */
export function readContractedShipping(
  shipment: ShipmentLike,
  orderShippingAmount?: number | null,
): ContractedShippingInfo | null {
  if (!shipment) return null
  const meta = shipment.metadata && typeof shipment.metadata === 'object' ? shipment.metadata : null
  const pickup = isOrderStorePickup({ shipment })
  const kind = orderShippingKind({ shipment })

  const etaDaysMin = num(meta?.eta_days_min ?? meta?.etaDaysMin)
  const etaDaysMax = num(meta?.eta_days_max ?? meta?.etaDaysMax)
  const serviceCode = str(meta?.service_code ?? meta?.serviceCode ?? shipment.service)
  const optionId = str(meta?.option_id ?? meta?.optionId)
  const metaLabel = str(meta?.label)

  const carrierService = [shipment.carrier, shipment.service].filter(Boolean).join(' / ') || null

  let label =
    metaLabel ||
    carrierService ||
    (serviceCode && serviceCode !== 'pickup' ? serviceCode : null) ||
    null

  const modality =
    pickup
      ? 'Retirada na loja'
      : kind === 'melhorenvio'
        ? 'Melhor Envio'
        : kind === 'own'
          ? 'Frete próprio'
          : kind === 'mock'
            ? 'Frete (mock)'
            : 'Frete'

  if (!label) label = modality
  if (pickup) {
    const genericPickup =
      !metaLabel || /^(pickup|retirada)(\s|$)/i.test(metaLabel) || /pickup/i.test(metaLabel)
    label = genericPickup ? 'Retirada na loja' : metaLabel
  }

  const charged =
    num(meta?.charged_shipping ?? meta?.chargedShipping) ??
    (shipment.amount != null ? Number(shipment.amount) : null) ??
    (orderShippingAmount != null ? Number(orderShippingAmount) : null)

  return {
    label,
    etaLabel: formatContractedEtaDays(etaDaysMin, etaDaysMax, { pickup }),
    etaDaysMin,
    etaDaysMax,
    serviceCode,
    optionId,
    pickup,
    modality,
    chargedAmount: charged,
  }
}

/** Linha curta para badge/header: "PAC · 3–5 dias úteis". */
export function contractedShippingShortLine(info: ContractedShippingInfo | null): string | null {
  if (!info) return null
  if (info.pickup) return info.etaLabel ?? info.label
  if (info.etaLabel) return `${info.label} · ${info.etaLabel}`
  return info.label
}
