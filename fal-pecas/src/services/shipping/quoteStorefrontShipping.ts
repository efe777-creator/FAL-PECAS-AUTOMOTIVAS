import { quoteShippingEnvelope } from '@/services/shipping/quoteShippingEnvelope'
import {
  buildErrorEnvelope,
  buildOkEnvelope,
  logisticsGaps,
  type ShippingQuoteEnvelope,
} from '@/services/shipping/shippingQuoteContract'
import { getCarrierByEnvKey } from '@/services/shipping/carrierRegistry'
import type { ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

export type StorefrontQuoteResult = {
  envelope: ShippingQuoteEnvelope
  /** Frete próprio cobriria o CEP, mas falta número do endereço. */
  needsAddressNumber: boolean
}

/** Opções cotáveis na loja (exclui placeholders e tabela mock). */
export function selectableShippingOptions(
  options: ShippingQuoteOption[],
): ShippingQuoteOption[] {
  return options.filter((o) => {
    if (o.metadata && o.metadata.selectable === false) return false
    if (o.id === 'own:needs_number' || o.serviceCode === 'needs_number') return false
    if (o.id === 'own:manual_review' || o.serviceCode === 'manual_review') return false
    if (o.provider === 'mock' && o.metadata?.kind === 'mock_table') return false
    if (o.id === 'mock:economic' || o.id === 'mock:express') return false
    return true
  })
}

export function storefrontNeedsAddressNumber(options: ShippingQuoteOption[]): boolean {
  return options.some(
    (o) => o.id === 'own:needs_number' || o.serviceCode === 'needs_number',
  )
}

/**
 * Cotação da vitrine (PDP/carrinho): Melhor Envio + frete próprio.
 * Não usa tabela mock como frete real. Sem opções reais → unavailable / missing_logistics.
 */
export async function quoteStorefrontShippingEnvelope(
  req: ShippingQuoteRequest,
): Promise<StorefrontQuoteResult> {
  const gaps = logisticsGaps(req)
  if (gaps.length) {
    const desc = getCarrierByEnvKey('melhorenvio')
    return {
      needsAddressNumber: false,
      envelope: buildErrorEnvelope({
        providerId: desc.id,
        mode: desc.mode,
        status: 'missing_logistics',
        req,
        message:
          'Este produto ainda não tem peso/dimensões suficientes para cotar frete. A loja não exibe estimativa inventada.',
        disclaimer: null,
      }),
    }
  }

  const env = await quoteShippingEnvelope(req, 'melhorenvio')
  const needsAddressNumber = storefrontNeedsAddressNumber(env.options)

  if (env.status !== 'ok') {
    return {
      needsAddressNumber,
      envelope: { ...env, disclaimer: null },
    }
  }

  const selectable = selectableShippingOptions(env.options)

  if (!selectable.length) {
    return {
      needsAddressNumber,
      envelope: buildErrorEnvelope({
        providerId: env.providerId,
        mode: env.mode,
        status: 'unavailable',
        req,
        message: needsAddressNumber
          ? 'Informe o número do endereço para cotar a entrega FAL nesta região. Sem opções de transportadora para este CEP no momento.'
          : 'Nenhuma opção de frete real disponível para este CEP no momento.',
        disclaimer: null,
      }),
    }
  }

  return {
    needsAddressNumber,
    envelope: buildOkEnvelope({
      providerId: env.providerId,
      mode: env.mode,
      options: selectable,
      req,
      disclaimer:
        'Cotação Melhor Envio (sandbox) e/ou frete próprio FAL quando houver cobertura. Confirme no checkout.',
    }),
  }
}
