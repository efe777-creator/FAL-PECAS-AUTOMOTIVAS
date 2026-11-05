export type OwnProductLogisticProfile = {
  productId: string
  polUnit: number | null
  ownDeliveryAllowed: boolean
  vehicleMinCode: string | null
  compatibleVehicleCodes: string[]
  restrictions?: unknown
}

export type OwnPolResult =
  | { ok: true; polTotal: number }
  | { ok: false; status: 'ineligible' | 'incomplete'; productId?: string; message: string }

/** POL_TOTAL = Σ(qty × POL_unit). Perfil incompleto = incomplete (PENDÊNCIA P-OWN-5: block). */
export function computePolTotal(
  items: { productId: string; quantity: number }[],
  profilesByProductId: Record<string, OwnProductLogisticProfile>,
): OwnPolResult {
  let polTotal = 0
  for (const item of items) {
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0))
    if (qty < 1) {
      return { ok: false, status: 'incomplete', productId: item.productId, message: 'Quantidade inválida' }
    }
    const profile = profilesByProductId[item.productId]
    if (!profile) {
      return {
        ok: false,
        status: 'incomplete',
        productId: item.productId,
        message: 'Perfil logístico ausente',
      }
    }
    if (!profile.ownDeliveryAllowed) {
      return {
        ok: false,
        status: 'ineligible',
        productId: item.productId,
        message: 'Produto não elegível ao frete próprio',
      }
    }
    if (profile.polUnit == null || !Number.isFinite(Number(profile.polUnit)) || Number(profile.polUnit) < 0) {
      return {
        ok: false,
        status: 'incomplete',
        productId: item.productId,
        message: 'POL unitário ausente',
      }
    }
    polTotal += qty * Number(profile.polUnit)
  }
  return { ok: true, polTotal: Math.round(polTotal * 100) / 100 }
}
