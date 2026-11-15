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
    asaasCardCheckoutReady: ASAAS_CARD_CHECKOUT_READY,
  }
}

function providerEnabled(provider: 'mercadopago' | 'asaas', routing: PaymentRoutingConfig): boolean {
  return provider === 'asaas' ? routing.asaasEnabled : routing.mercadopagoEnabled
}

/**
 * Disponibilidade efetiva = integração técnica AND política comercial AND roteamento FAL PAY.
 * Cartão usa capacidades Asaas (sempre). Pix usa o provedor roteado pelo valor.
 */
export async function getEffectivePaymentAvailability(
  amountCents?: number | null,
): Promise<EffectivePaymentAvailability> {
  const settings = await getPaymentDisplaySettings()
  const { getPaymentRoutingConfig } = await import('@/services/payments/paymentRoutingService')
  const routing = await getPaymentRoutingConfig()
  return resolveEffectivePaymentAvailability(settings, routing, amountCents)
}

/** Versão síncrona quando settings/roteamento já foram carregados (hooks / checkout). */
export function resolveEffectivePaymentAvailability(
  settings: PaymentDisplaySettings | null | undefined,
  routing?: PaymentRoutingConfig | null,
  amountCents?: number | null,
): EffectivePaymentAvailability {
  const integrationOn = isMercadoPagoCheckoutEnabled()
  const asaasMethods = new Set(paymentEngine.getAdapter('asaas')?.capabilities().methods ?? [])
  const mpMethods = new Set(paymentEngine.getAdapter('mercadopago')?.capabilities().methods ?? [])

  const pixCommercial = settings?.pixEnabled !== false
  const creditCommercial =
    settings?.creditEnabled != null
      ? Boolean(settings.creditEnabled)
      : settings?.cardEnabled !== false
  const debitCommercial =
    settings?.debitEnabled != null
      ? Boolean(settings.debitEnabled)
      : settings?.cardEnabled !== false

  let credit =
    integrationOn && creditCommercial && asaasMethods.has('credit_card') && ASAAS_CARD_CHECKOUT_READY
  let debit =
    integrationOn && debitCommercial && asaasMethods.has('debit_card') && ASAAS_CARD_CHECKOUT_READY
  let cardBlockedReason: string | null = null

  if (integrationOn && routing) {
    if (!routing.asaasEnabled) {
      credit = false
      debit = false
      cardBlockedReason = 'Asaas desativado no roteamento (Pagamentos → Métodos).'
    } else if (!ASAAS_CARD_CHECKOUT_READY) {
      credit = false
      debit = false
      cardBlockedReason = 'Checkout de cartão Asaas ainda não liberado. Use Pix.'
    }
  }

  const pixCapability = mpMethods.has('pix') || asaasMethods.has('pix')
  const pixBase = integrationOn && pixCommercial && pixCapability
  let pix = pixBase
  if (pixBase && routing) {
    const store = storeOverridesFrom(routing)
    if (amountCents != null && Number.isFinite(amountCents)) {
      const pixRoute = decidePaymentRoute({ method: 'pix', amountCents }, store)
      pix = providerEnabled(pixRoute.provider, routing)
    } else {
      const below = decidePaymentRoute({ method: 'pix', amountCents: 1 }, store)
      const above = decidePaymentRoute(
        { method: 'pix', amountCents: routing.pixMpMaxAmountCents + 1 },
        store,
      )
      pix =
        providerEnabled(below.provider, routing) || providerEnabled(above.provider, routing)
    }
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
