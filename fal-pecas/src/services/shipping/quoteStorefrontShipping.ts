import { quoteShippingEnvelope } from '@/services/shipping/quoteShippingEnvelope'
import {
  buildErrorEnvelope,
  buildOkEnvelope,
  logisticsGaps,
  type ShippingQuoteEnvelope,
} from '@/services/shipping/shippingQuoteContract'
import { ensureCustomerShippingOptions } from '@/services/shipping/storePickupOption'
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
    if (o.metadata?.ephemeral === true) return false
    if (o.id.startsWith('meq:ephemeral:')) return false
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
  // Gaps de dims/peso NÃO bloqueiam own/pickup — o provider ME trata ME separado.
  const env = await quoteShippingEnvelope(req, 'melhorenvio')
  const needsAddressNumber = storefrontNeedsAddressNumber(env.options)
  const gaps = logisticsGaps(req)

  if (env.status !== 'ok') {
    return {
      needsAddressNumber,
      envelope: { ...env, disclaimer: null },
    }
  }

  const selectable = selectableShippingOptions(ensureCustomerShippingOptions(env.options))

  if (!selectable.length) {
    return {
      needsAddressNumber,
      envelope: buildErrorEnvelope({
        providerId: env.providerId,
        mode: env.mode,
        status: gaps.length ? 'missing_logistics' : 'unavailable',
        req,
        message: needsAddressNumber
          ? 'Informe o número do endereço para cotar a entrega FAL nesta região. Sem opções de transportadora para este CEP no momento.'
          : gaps.length
            ? 'Este produto ainda não tem peso ou medidas suficientes para cotar transportadoras. Frete FAL / retirada podem aparecer quando cobertos.'
            : 'Nenhuma opção de entrega disponível para este CEP no momento.',
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
      disclaimer: 'Valores estimados de entrega. Confirme o frete no checkout.',
      message: env.message,
    }),
  }
}
