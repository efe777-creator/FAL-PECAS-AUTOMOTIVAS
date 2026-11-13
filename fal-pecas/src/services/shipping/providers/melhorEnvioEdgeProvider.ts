import { toUserMessage } from '@/lib/toUserMessage'
import { invokeQuoteShippingEdge } from '@/services/shipping/edgeQuoteClient'
import { logisticsGaps } from '@/services/shipping/shippingQuoteContract'
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
 * Falha / gaps ME NÃO engolem opções own/pickup.
 */
export const melhorEnvioEdgeProvider: ShippingProvider = {
  async quote(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    const own = await resolveOwnQuoteOptions(req)
    const gaps = logisticsGaps(req)
    let meOpts: ShippingQuoteOption[] = []
    let meError: string | null = null

    if (!gaps.length) {
      try {
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
          meError = 'Resposta inválida da cotação Melhor Envio'
        } else if (data.status && data.status !== 'ok') {
          meError = data.message || `Cotação ME: ${data.status}`
        } else {
          meOpts = Array.isArray(data.options) ? data.options : []
        }
      } catch (e) {
        meError = toUserMessage(e, 'Erro ao cotar Melhor Envio')
      }
    }

    const combined = withStorePickupOption([...own, ...meOpts])
    if (combined.length) return combined

    if (gaps.length) {
      throw new Error(
        'Faltam peso ou medidas do produto. Não foi possível cotar a entrega sem inventar valores.',
      )
    }
    if (meError) throw new Error(meError)
    return []
  },
}
