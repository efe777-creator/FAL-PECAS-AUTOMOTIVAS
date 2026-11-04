import {
  cepInOwnDeliveryRanges,
  getOwnDeliverySettings,
} from '@/services/admin/adminOwnDeliveryService'
import { invokeQuoteShippingEdge } from '@/services/shipping/edgeQuoteClient'
import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

type EdgeEnvelope = {
  status?: string
  options?: ShippingQuoteOption[]
  message?: string
  providerId?: string
}

async function ownOptions(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
  try {
    const own = await getOwnDeliverySettings()
    if (!own?.enabled || !own.rates.length) return []
    if (!cepInOwnDeliveryRanges(req.postalCode, own.cepRanges)) return []
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

/**
 * Cotação Melhor Envio via Edge `quote-shipping` + frete próprio quando coberto.
 * Sem secrets na Edge → erro honesto (not_configured).
 */
export const melhorEnvioEdgeProvider: ShippingProvider = {
  async quote(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    const own = await ownOptions(req)
    const data = (await invokeQuoteShippingEdge({
      postalCode: req.postalCode,
      state: req.state,
      city: req.city,
      subtotal: req.subtotal,
      itemCount: req.itemCount,
      originPostalCode: req.originPostalCode,
      provider: 'melhorenvio',
      items: req.items?.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        weightKg: i.weightKg,
        heightCm: i.heightCm,
        widthCm: i.widthCm,
        lengthCm: i.lengthCm,
      })),
      totalWeightKg: req.totalWeightKg,
    })) as EdgeEnvelope

    if (!data || typeof data !== 'object') {
      throw new Error('Resposta inválida da cotação Melhor Envio')
    }
    if (data.status && data.status !== 'ok') {
      throw new Error(data.message || `Cotação ME: ${data.status}`)
    }
    const meOpts = Array.isArray(data.options) ? data.options : []
    return [...own, ...meOpts]
  },
}
