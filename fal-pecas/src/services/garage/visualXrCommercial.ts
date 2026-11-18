/**
 * Fase C C4 — bridge comercial SKU em XR.
 * Mostra peça/SKU e deep-link para ficha. NUNCA checkout / carrinho in-XR.
 */

import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'

export type VisualXrCommercialPart = {
  key: string
  name: string
  sku: string | null
  productId: string | null
  state: string
}

/** Contrato: sessão XR não adiciona ao carrinho nem inicia pagamento. */
export function xrNeverCheckoutsInSession(): true {
  return true
}

export function xrProductPath(productId: string): string {
  return `/produto/${encodeURIComponent(productId)}`
}

/**
 * Peças elegíveis ao HUD comercial (máx. 12).
 * Só com sync ligado; exige productId ou sku.
 */
export function buildXrCommercialParts(
  parts: VisualPartPreview[],
  syncEnabled: boolean,
): VisualXrCommercialPart[] {
  if (!syncEnabled) return []
  const out: VisualXrCommercialPart[] = []
  for (const p of parts) {
    if (!p.productId && !p.sku) continue
    out.push({
      key: p.key,
      name: p.name,
      sku: p.sku,
      productId: p.productId,
      state: p.state,
    })
    if (out.length >= 12) break
  }
  return out
}

export function xrCommercialTelemetryReason(part: VisualXrCommercialPart): string {
  // Sem PII: só flags estruturais
  return [
    'sku_interest',
    part.productId ? 'has_product' : 'no_product',
    part.sku ? 'has_sku' : 'no_sku',
    `state_${part.state}`,
  ].join('+')
}
