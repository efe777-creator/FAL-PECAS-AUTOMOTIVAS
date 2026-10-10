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
} from '@/services/shipping/shippingQuoteContract'
import type { ShippingQuoteRequest } from '@/types'

function classifyError(message: string): ShippingQuoteEnvelope['status'] {
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

  // Live futura: gaps logísticos bloqueiam (sandbox/mock ainda cotam com hints).
  if (desc.mode === 'live') {
    const gaps = logisticsGaps(req)
    if (gaps.length) {
      return buildErrorEnvelope({
        providerId: desc.id,
        mode: desc.mode,
        status: 'missing_logistics',
        req,
        message:
          'Dados logísticos incompletos (peso/dimensões). Cotação live indisponível sem inventar valores.',
        disclaimer,
      })
    }
  }

  try {
    const provider = resolveCarrierProvider(desc.envKey)
    const options = await provider.quote(req)
    if (!options.length) {
      return buildErrorEnvelope({
        providerId: desc.id,
        mode: desc.mode,
        status: 'unavailable',
        req,
        message: 'Nenhuma opção de frete disponível para este CEP',
        disclaimer,
      })
    }
    return buildOkEnvelope({
      providerId: desc.id,
      mode: desc.mode,
      options,
      req,
      disclaimer,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao cotar frete'
    return buildErrorEnvelope({
      providerId: desc.id,
      mode: desc.mode,
      status: classifyError(message),
      req,
      message,
      disclaimer,
    })
  }
}
