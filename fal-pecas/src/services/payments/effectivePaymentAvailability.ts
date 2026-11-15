import type { PaymentDisplaySettings } from '@/lib/paymentDisplay'
import { ASAAS_CARD_CHECKOUT_READY } from '@/services/payments/falPayCapabilities'
import { paymentEngine } from '@/services/payments/engine'
import { isMercadoPagoCheckoutEnabled } from '@/services/payments/paymentService'
import type { PaymentRoutingConfig } from '@/services/payments/paymentRoutingService'
import { decidePaymentRoute } from '@/services/payments/routing/paymentRouter'
import { getPaymentDisplaySettings } from '@/services/store/paymentDisplayService'

export type EffectivePaymentAvailability = {
  integrationOn: boolean
  pix: boolean
  /** Qualquer cartão (crédito ou débito). */
  card: boolean
  credit: boolean
  debit: boolean
  installmentsEnabled: boolean
  settings: PaymentDisplaySettings | null
  /** Por que cartão pode estar off com integração ligada. */
  cardBlockedReason?: string | null
}

function storeOverridesFrom(config: PaymentRoutingConfig) {
  return {
    pixMpMaxAmountCents: config.pixMpMaxAmountCents,
    pixBelowLimitProvider: config.pixBelowLimitProvider,
    pixAboveLimitProvider: config.pixAboveLimitProvider,
    cardProvider: config.cardProvider,
    boletoProvider: config.boletoProvider,
  }
}

/**
 * Disponibilidade efetiva = integração técnica AND política comercial AND roteamento FAL PAY.
 */
export async function getEffectivePaymentAvailability(): Promise<EffectivePaymentAvailability> {
  const settings = await getPaymentDisplaySettings()
  const { getPaymentRoutingConfig } = await import('@/services/payments/paymentRoutingService')
  const routing = await getPaymentRoutingConfig()
  return resolveEffectivePaymentAvailability(settings, routing)
}

/** Versão síncrona quando settings/roteamento já foram carregados (hooks / checkout). */
export function resolveEffectivePaymentAvailability(
  settings: PaymentDisplaySettings | null | undefined,
  routing?: PaymentRoutingConfig | null,
): EffectivePaymentAvailability {
  const integrationOn = isMercadoPagoCheckoutEnabled()
  const caps = paymentEngine.getAdapter('mercadopago')?.capabilities()
  const methods = new Set(caps?.methods ?? [])
  const pixCommercial = settings?.pixEnabled !== false
  const creditCommercial =
    settings?.creditEnabled != null
      ? Boolean(settings.creditEnabled)
      : settings?.cardEnabled !== false
  const debitCommercial =
    settings?.debitEnabled != null
      ? Boolean(settings.debitEnabled)
      : settings?.cardEnabled !== false

  let credit = integrationOn && creditCommercial && methods.has('credit_card')
  let debit = integrationOn && debitCommercial && methods.has('debit_card')
  let cardBlockedReason: string | null = null

  if (integrationOn && routing) {
    const store = storeOverridesFrom(routing)
    const cardRoute = decidePaymentRoute({ method: 'credit_card', amountCents: 100 }, store)
    if (cardRoute.provider === 'asaas') {
      if (!routing.asaasEnabled) {
        credit = false
        debit = false
        cardBlockedReason = 'Asaas desativado no roteamento (payment_routing_config).'
      } else if (!ASAAS_CARD_CHECKOUT_READY) {
        credit = false
        debit = false
        cardBlockedReason =
          'Cartão roteado para Asaas — checkout de cartão ainda não liberado. Use Pix ou defina card_provider=mercadopago no roteamento.'
      }
    } else if (cardRoute.provider === 'mercadopago' && !routing.mercadopagoEnabled) {
      credit = false
      debit = false
      cardBlockedReason = 'Mercado Pago desativado no roteamento.'
    }
  }

  const pixBase = integrationOn && pixCommercial && methods.has('pix')
  let pix = pixBase
  if (pixBase && routing && !routing.mercadopagoEnabled && !routing.asaasEnabled) {
    pix = false
  }

  return {
    integrationOn,
    pix,
    credit,
    debit,
    card: credit || debit,
    installmentsEnabled: Boolean(settings?.installmentsEnabled),
    settings: settings ?? null,
    cardBlockedReason,
  }
}