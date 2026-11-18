/**
 * Fase C C4–C5 — bridge comercial SKU em XR.
 * C4: deep-link ficha. C5: exit-to-cart (carrinho web). NUNCA pagamento in-XR.
 */

import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'

export type VisualXrCommercialPart = {
  key: string
  name: string
  sku: string | null
  productId: string | null
  state: string
}

/** C5: pagamento / gateway NUNCA roda dentro da sessão XR. */
export function xrNeverPaysInSession(): true {
  return true
}

/**
 * C4 legado: “sem checkout na XR” = sem pagamento imersivo.
 * Carrinho via exit-to-web é C5 (`xrCartPath` + addItem fora da sessão).
 */
export function xrNeverCheckoutsInSession(): true {
  return xrNeverPaysInSession()
}

export function xrProductPath(productId: string): string {
  return `/produto/${encodeURIComponent(productId)}`
}

/** C5: destino web após encerrar XR (nunca form de pagamento no headset). */
export function xrCartPath(): '/carrinho' {
  return '/carrinho'
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
  return [
    'sku_interest',
    part.productId ? 'has_product' : 'no_product',
    part.sku ? 'has_sku' : 'no_sku',
    `state_${part.state}`,
  ].join('+')
}

export function xrExitToCartTelemetryReason(productId: string): string {
  return productId ? 'exit_to_cart+has_product' : 'exit_to_cart+no_product'
}
