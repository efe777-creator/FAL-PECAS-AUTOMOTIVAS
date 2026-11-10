import { invokeQuoteShippingEdge } from '@/services/shipping/edgeQuoteClient'
import { resolveOwnQuoteOptions } from '@/services/shipping/own/ownQuoteOptions'
import { withStorePickupOption } from '@/services/shipping/storePickupOption'
import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

type EdgeEnvelope = {
  status?: string
  options?: ShippingQuoteOption[]
  message?: string
  providerId?: string
}

/**
 * Cotação Melhor Envio via Edge `quote-shipping` + frete próprio (flat ou v2).
 */
export const melhorEnvioEdgeProvider: ShippingProvider = {
  async quote(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    const own = await resolveOwnQuoteOptions(req)
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
    return withStorePickupOption([...own, ...meOpts])
  },
}
