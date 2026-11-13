import type { PaymentDisplaySettings } from '@/lib/paymentDisplay'
import { paymentEngine } from '@/services/payments/engine'
import { isMercadoPagoCheckoutEnabled } from '@/services/payments/paymentService'
import { getPaymentDisplaySettings } from '@/services/store/paymentDisplayService'

export type EffectivePaymentAvailability = {
  integrationOn: boolean
  pix: boolean
  card: boolean
  installmentsEnabled: boolean
  settings: PaymentDisplaySettings | null
}

/**
 * Disponibilidade efetiva = integração técnica AND política comercial.
 * Fonte comercial: store_payment_display. Técnica: VITE_PAYMENT_PROVIDER + adapter.
 */
export async function getEffectivePaymentAvailability(): Promise<EffectivePaymentAvailability> {
  const integrationOn = isMercadoPagoCheckoutEnabled()
  const settings = await getPaymentDisplaySettings()
  const caps = paymentEngine.getAdapter('mercadopago')?.capabilities()
  const methods = new Set(caps?.methods ?? [])

  const pixCommercial = settings?.pixEnabled !== false
  const cardCommercial = settings?.cardEnabled !== false

  return {
    integrationOn,
    pix: integrationOn && pixCommercial && methods.has('pix'),
    card:
      integrationOn &&
      cardCommercial &&
      (methods.has('credit_card') || methods.has('debit_card')),
    installmentsEnabled: Boolean(settings?.installmentsEnabled),
    settings,
  }
}

/** Versão síncrona quando settings já foram carregados (hooks / checkout). */
export function resolveEffectivePaymentAvailability(
  settings: PaymentDisplaySettings | null | undefined,
): EffectivePaymentAvailability {
  const integrationOn = isMercadoPagoCheckoutEnabled()
  const caps = paymentEngine.getAdapter('mercadopago')?.capabilities()
  const methods = new Set(caps?.methods ?? [])
  const pixCommercial = settings?.pixEnabled !== false
  const cardCommercial = settings?.cardEnabled !== false
  return {
    integrationOn,
    pix: integrationOn && pixCommercial && methods.has('pix'),
    card:
      integrationOn &&
      cardCommercial &&
      (methods.has('credit_card') || methods.has('debit_card')),
    installmentsEnabled: Boolean(settings?.installmentsEnabled),
    settings: settings ?? null,
  }
}
