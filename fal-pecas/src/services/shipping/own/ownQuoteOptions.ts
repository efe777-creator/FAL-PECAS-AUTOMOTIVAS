import {
  cepInOwnDeliveryRanges,
  getOwnDeliverySettings,
} from '@/services/admin/adminOwnDeliveryService'
import { invokeOwnDeliveryQuote } from '@/services/shipping/ownQuoteClient'
import type { ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

/** Opções frete próprio: flat (v1) ou distance_vehicle (v2 via Edge). */
export async function resolveOwnQuoteOptions(
  req: ShippingQuoteRequest,
): Promise<ShippingQuoteOption[]> {
  try {
    const own = await getOwnDeliverySettings()
    if (!own?.enabled) return []
    if (!cepInOwnDeliveryRanges(req.postalCode, own.cepRanges)) return []

    if (own.pricingMode === 'distance_vehicle') {
      const number = (req.number ?? '').trim()
      if (!number) {
        return [
          {
            id: 'own:needs_number',
            provider: 'own',
            serviceCode: 'needs_number',
            label: 'Entrega FAL — informe o número do endereço',
            amount: 0,
            etaDaysMin: own.etaDaysMin,
            etaDaysMax: own.etaDaysMax,
            metadata: { kind: 'own_needs_number', selectable: false },
          },
        ]
      }
      const items = (req.items ?? [])
        .filter((i) => i.productId)
        .map((i) => ({ productId: i.productId, quantity: i.quantity }))
      if (!items.length) return []

      const res = await invokeOwnDeliveryQuote({
        postalCode: req.postalCode,
        number,
        street: req.street ?? '',
        district: req.district,
        city: req.city,
        state: req.state,
        items,
      })

      if (res.status === 'priced' && res.options?.length) return res.options
      if (res.status === 'manual_review') {
        return [
          {
            id: 'own:manual_review',
            provider: 'own',
            serviceCode: 'manual_review',
            label: res.message || 'Entrega FAL — análise manual',
            amount: 0,
            etaDaysMin: own.etaDaysMin,
            etaDaysMax: own.etaDaysMax,
            metadata: { kind: 'own_manual_review', selectable: false },
          },
        ]
      }
      return []
    }

    if (!own.rates.length) return []
    return own.rates.map((rate) => ({
      id: rate.id,
      provider: 'own',
      serviceCode: rate.serviceCode,
      label: rate.label,
      amount: Number(rate.amount),
      etaDaysMin: rate.etaDaysMin,
      etaDaysMax: rate.etaDaysMax,
      metadata: { kind: 'own_delivery_table', coverage: own.coverageLabel },
    }))
  } catch {
    return []
  }
}
