import type { ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

/**
 * Contrato de cotação FAL (camada B) — extensão tipada sem quebrar ShippingQuoteOption.
 * UI (camada A) e provedores (camada C) devem convergir para este envelope.
 */

export type ShippingQuoteStatus =
  | 'ok'
  | 'unavailable'
  | 'invalid_cep'
  | 'missing_logistics'
  | 'provider_error'
  | 'not_configured'
  | 'expired'

export interface ShippingQuoteEnvelope {
  status: ShippingQuoteStatus
  providerId: string
  mode: 'mock' | 'sandbox' | 'live' | 'stub'
  options: ShippingQuoteOption[]
  quotedAt: string
  expiresAt?: string
  /** Mensagem segura para UI (sem secrets). */
  message?: string
  /** Fingerprint do request para invalidar ao mudar CEP/itens/qty. */
  requestFingerprint: string
  disclaimer?: string | null
}

export function fingerprintQuoteRequest(req: ShippingQuoteRequest): string {
  const items = (req.items ?? [])
    .map((i) =>
      [
        i.productId,
        i.quantity,
        i.weightKg ?? '',
        i.heightCm ?? '',
        i.widthCm ?? '',
        i.lengthCm ?? '',
      ].join(':'),
    )
    .sort()
    .join('|')
  return [
    req.originPostalCode ?? '',
    req.postalCode.replace(/\D/g, ''),
    req.state,
    req.city,
    req.subtotal.toFixed(2),
    req.itemCount,
    req.totalWeightKg ?? '',
    items,
  ].join('::')
}

export function defaultQuoteTtlMs(): number {
  return 15 * 60_000
}

export function buildOkEnvelope(input: {
  providerId: string
  mode: ShippingQuoteEnvelope['mode']
  options: ShippingQuoteOption[]
  req: ShippingQuoteRequest
  disclaimer?: string | null
  ttlMs?: number
}): ShippingQuoteEnvelope {
  const quotedAt = new Date().toISOString()
  const ttl = input.ttlMs ?? defaultQuoteTtlMs()
  return {
    status: 'ok',
    providerId: input.providerId,
    mode: input.mode,
    options: input.options,
    quotedAt,
    expiresAt: new Date(Date.now() + ttl).toISOString(),
    requestFingerprint: fingerprintQuoteRequest(input.req),
    disclaimer: input.disclaimer,
  }
}

export function buildErrorEnvelope(input: {
  providerId: string
  mode: ShippingQuoteEnvelope['mode']
  status: Exclude<ShippingQuoteStatus, 'ok'>
  req: ShippingQuoteRequest
  message: string
  disclaimer?: string | null
}): ShippingQuoteEnvelope {
  return {
    status: input.status,
    providerId: input.providerId,
    mode: input.mode,
    options: [],
    quotedAt: new Date().toISOString(),
    requestFingerprint: fingerprintQuoteRequest(input.req),
    message: input.message,
    disclaimer: input.disclaimer,
  }
}

/** Itens sem peso/dimensões — lacuna logística (não inventar defaults silenciosos na live). */
export function logisticsGaps(req: ShippingQuoteRequest): string[] {
  const gaps: string[] = []
  const items = req.items ?? []
  if (!items.length && req.totalWeightKg == null) {
    gaps.push('itens_ou_peso_total_ausentes')
  }
  for (const it of items) {
    if (it.weightKg == null || !(it.weightKg > 0)) {
      gaps.push(`peso_ausente:${it.productId}`)
    }
  }
  return gaps
}
