import {
  commercialShippingDisclaimer,
  getCarrierByEnvKey,
  resolveCarrierProvider,
} from '@/services/shipping/carrierRegistry'
import {
  buildErrorEnvelope,
  buildOkEnvelope,
  logisticsGaps,
  type ShippingQuoteEnvelope,
  type ShippingQuoteStatus,
} from '@/services/shipping/shippingQuoteContract'
import { toUserMessage } from '@/lib/toUserMessage'
import type { ShippingQuoteRequest } from '@/types'

function classifyError(message: string): Exclude<ShippingQuoteStatus, 'ok'> {
  const m = message.toLowerCase()
  if (m.includes('cep')) return 'invalid_cep'
  if (m.includes('não implementado') || m.includes('nao implementado')) return 'not_configured'
  if (m.includes('indispon')) return 'unavailable'
  return 'provider_error'
}

/**
 * Cotação com envelope (status + validade + disclaimer).
 * Mantém providers atuais; UI nova (PDP/carrinho) deve preferir este helper.
 */
export async function quoteShippingEnvelope(
  req: ShippingQuoteRequest,
  envKey?: string | null,
): Promise<ShippingQuoteEnvelope> {
  const desc = getCarrierByEnvKey(
    envKey ?? (import.meta.env.VITE_SHIPPING_PROVIDER as string | undefined),
  )
  const disclaimer = commercialShippingDisclaimer(desc)

  if (!desc.enabled) {
    return buildErrorEnvelope({
      providerId: desc.id,
      mode: desc.mode,
      status: 'not_configured',
      req,
      message: `${desc.label} não está habilitada.`,
      disclaimer,
    })
  }

  // Gaps ME: provider ainda pode devolver own/pickup. Só erro se lista vazia.
  const gaps =
    desc.mode === 'live' || desc.envKey === 'melhorenvio' ? logisticsGaps(req) : []

  try {
    const provider = resolveCarrierProvider(desc.envKey)
    const options = await provider.quote(req)
    if (!options.length) {
      return buildErrorEnvelope({
        providerId: desc.id,
        mode: desc.mode,
        status: gaps.length ? 'missing_logistics' : 'unavailable',
        req,
        message: gaps.length
          ? 'Faltam peso ou medidas do produto. Não foi possível cotar a entrega sem inventar valores.'
          : 'Nenhuma opção de frete disponível para este CEP',
        disclaimer,
      })
    }
    return buildOkEnvelope({
      providerId: desc.id,
      mode: desc.mode,
      options,
      req,
      disclaimer,
      message: gaps.length
        ? 'Cotação Melhor Envio indisponível (peso/medidas). Opções FAL / retirada mantidas.'
        : undefined,
    })
  } catch (e) {
    const message = toUserMessage(e, 'Erro ao cotar frete')
    return buildErrorEnvelope({
      providerId: desc.id,
      mode: desc.mode,
      status: gaps.length ? 'missing_logistics' : classifyError(message),
      req,
      message,
      disclaimer,
    })
  }
}
